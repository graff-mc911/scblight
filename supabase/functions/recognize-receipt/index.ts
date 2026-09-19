import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function buildSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are a receipt data extractor for personal bookkeeping (EU / Spanish / German receipts).
Look at the receipt image and return ONLY a single JSON object.
No markdown, no code fences, no commentary.

Schema (exact keys):
{
  "date": "YYYY-MM-DD or empty string if unknown",
  "total_amount": number (gross total paid as JSON number with dot decimal, e.g. 17.59; use 0 if unknown),
  "currency": "ISO 4217 code like EUR, USD, UAH (default EUR if unclear)",
  "merchant": "store or vendor NAME only (not street address), empty string if unknown",
  "category": "one of: food, auto, entertainment, materials, utilities, health, travel, office, other",
  "payment_method": "one of: cash, card, visa, mastercard, amex, paypal, transfer, other — or empty string",
  "receipt_number": "ticket/factura number if visible, else empty string",
  "items": "newline-separated line items as 'name: amount' when readable, else empty string"
}

Spanish / EU rules (critical):
- Dates are usually DD/MM/YYYY or DD/MM/YY (NOT US MM/DD). Example: 18/09/2026 → "2026-09-18".
- Today is ${today}. Never invent year 2023 when the receipt shows 2026 (or the current year).
- Decimal comma: "17,59 €" / "TOTAL 17,59" → total_amount 17.59 (JSON number, NOT a string with comma).
- Keywords for total: TOTAL, TOTAL €, Importe total, Total a pagar, Suma, FACTURA SIMPLIFICADA total line.
- Do NOT use IVA / BASE IMPONIBLE / Cuota lines as the total.
- Payment: "TARJETA BANCARIA", "TARJETA", "CARD" → payment_method "card". "EFECTIVO" / "METÁLICO" → "cash".
- Merchant: trade name at the top (e.g. shop brand). Do NOT put AV / CALLE / address lines into merchant.
- Grocery / bakery / café / restaurant → category "food".

General rules:
- Prefer the final amount due / total / Summe / Gesamt / Zu zahlen / TOTAL.
- Do not invent merchants or amounts; use empty string or 0 when unsure.
- category and payment_method must use the allowed values above.
- Output must be valid JSON parseable by JSON.parse.`;
}

type VisionBody = {
  imageBase64?: string;
  mimeType?: string;
  imageUrl?: string;
};

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

/** Light server-side cleanup so clients get usable numbers even if the model slips. */
function coercePayload(parsed: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...parsed };

  // Accept alias keys the model sometimes invents
  if (out.merchant == null || out.merchant === "") {
    out.merchant = out.store_name ?? out.vendor ?? out.vendor_name ?? out.comercio ?? "";
  }
  if (out.total_amount == null || out.total_amount === "" || out.total_amount === 0) {
    const alt = out.total ?? out.importe_total ?? out.importe ?? out.amount_gross ?? out.amount;
    if (alt != null && alt !== "") out.total_amount = alt;
  }

  // European decimal string → number
  if (typeof out.total_amount === "string") {
    let s = out.total_amount.replace(/\s/g, "").replace(/[€$£]/g, "");
    if (s.includes(",") && s.includes(".")) {
      s = s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    } else if (s.includes(",")) {
      const parts = s.split(",");
      s = parts[parts.length - 1].length <= 2
        ? parts.slice(0, -1).join("") + "." + parts[parts.length - 1]
        : s.replace(/,/g, "");
    }
    const n = Number(s);
    out.total_amount = Number.isFinite(n) ? n : 0;
  }

  if (typeof out.date === "string") {
    out.date = out.date.replace(/[T\s]\d{1,2}:\d{2}(:\d{2})?.*$/, "").trim();
  }

  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as VisionBody;
    const mime = body.mimeType || "image/jpeg";
    let imageUrl = body.imageUrl || "";

    if (!imageUrl && body.imageBase64) {
      const raw = body.imageBase64.replace(/^data:[^;]+;base64,/, "");
      imageUrl = `data:${mime};base64,${raw}`;
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageBase64 or imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract receipt fields as JSON per system instructions. Use DD/MM dates as European. total_amount must be a JSON number with a dot decimal.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    const openaiJson = await openaiRes.json();
    if (!openaiRes.ok) {
      return new Response(
        JSON.stringify({
          error: openaiJson?.error?.message || "OpenAI request failed",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const content = openaiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripCodeFences(content));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from model", raw: content }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = coercePayload(parsed);

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

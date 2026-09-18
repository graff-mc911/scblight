import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a receipt data extractor for personal bookkeeping.
Look at the receipt image and return ONLY a single JSON object.
No markdown, no code fences, no commentary.

Schema (exact keys):
{
  "date": "YYYY-MM-DD or empty string if unknown",
  "total_amount": number (gross total paid, use 0 if unknown),
  "currency": "ISO 4217 code like EUR, USD, UAH (default EUR if unclear)",
  "merchant": "store or vendor name, empty string if unknown",
  "category": "one of: food, auto, entertainment, materials, utilities, health, travel, office, other"
}

Rules:
- Prefer the final amount due / total / Summe / Gesamt / Zu zahlen.
- Do not invent merchants or amounts; use empty string or 0 when unsure.
- category must be exactly one of the allowed values.
- Output must be valid JSON parseable by JSON.parse.`;

type VisionBody = {
  imageBase64?: string;
  mimeType?: string;
  imageUrl?: string;
};

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract receipt fields as JSON per system instructions.",
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

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
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

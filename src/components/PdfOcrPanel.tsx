import React, { useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Loader2, ScanText, Upload } from 'lucide-react';
import type { UniversalDocument } from '../../lib/documentEditor/types';
import { createDocumentFromText } from '../../lib/documentEditor/templates';
import { getPdfPageCount, renderPdfPageToDataUrl } from '../../lib/documentEditor/pdfTools';

interface Props {
  onOpenInEditor: (doc: UniversalDocument) => void;
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(file.name);
}

export const PdfOcrPanel: React.FC<Props> = ({ onOpenInEditor }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const runOcr = async (file: File) => {
    if (!isPdf(file) && !isImage(file)) {
      setStatus('Підтримуються зображення та PDF');
      return;
    }

    setBusy(true);
    setText('');
    setProgress(0);
    setStatus('Запуск OCR...');

    try {
      const worker = await createWorker('ukr+eng', 1, {
        logger: (m) => {
          if (m.status) setStatus(m.status);
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
        },
      });

      const parts: string[] = [];

      if (isImage(file)) {
        setStatus('Розпізнавання зображення...');
        const { data } = await worker.recognize(file);
        parts.push(data.text.trim());
      } else {
        const pageCount = await getPdfPageCount(file);
        for (let p = 1; p <= pageCount; p += 1) {
          setStatus(`PDF: сторінка ${p}/${pageCount}`);
          setProgress(Math.round(((p - 1) / pageCount) * 100));
          // Рендер сторінки → JPEG → OCR
          const dataUrl = await renderPdfPageToDataUrl(file, p, 2, 0.9);
          const { data } = await worker.recognize(dataUrl);
          const pageText = data.text.trim();
          if (pageText) {
            parts.push(`--- Сторінка ${p} ---\n${pageText}`);
          }
        }
        setProgress(100);
      }

      await worker.terminate();
      setText(parts.join('\n\n').trim());
      setStatus('Готово');
    } catch {
      setStatus('Помилка розпізнавання');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <ScanText className="mx-auto text-orange-400 mb-3" size={40} />
        <h3 className="text-white font-semibold text-lg">OCR — розпізнавання тексту</h3>
        <p className="text-white/50 text-sm mt-1">
          Фото, скан або PDF (кожна сторінка окремо) → текст у редакторі
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full border-2 border-dashed border-white/15 rounded-2xl p-10 text-center hover:border-orange-400/50 hover:bg-white/5 transition-all disabled:opacity-50"
      >
        <Upload className="mx-auto mb-3 text-white/50" size={28} />
        <p className="text-white/80 font-medium">Завантажити зображення або PDF</p>
        <p className="text-white/40 text-sm mt-1">JPG, PNG, WEBP, PDF · UA + EN</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void runOcr(f);
          e.target.value = '';
        }}
      />

      {busy && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <Loader2 className="animate-spin text-orange-400" size={18} />
            {status} {progress > 0 && `(${progress}%)`}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {text && (
        <div className="space-y-3">
          <textarea
            readOnly
            value={text}
            rows={12}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white/80 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => onOpenInEditor(createDocumentFromText('OCR документ', text))}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold"
          >
            Відкрити в редакторі
          </button>
        </div>
      )}
    </div>
  );
};

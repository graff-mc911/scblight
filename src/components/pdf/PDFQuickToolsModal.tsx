import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  FilePlus2,
  Minimize2,
  PenLine,
  Scissors,
  X,
  Loader2,
  Download,
  Upload,
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { type QuickToolId, usePdfWorkspace } from '../../lib/pdf/workspaceStore';
import {
  compressFilesToPdf,
  exportPdfPagesAsJpg,
  getPdfPageCount,
  renderPdfPageToDataUrl,
  rotatePdfPages,
  splitPdfToPages,
  type CompressQuality,
} from '../../lib/documentEditor/pdfTools';
import { openPdfFiles } from './openPdfFiles';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PRIMARY: { id: QuickToolId; Icon: typeof PenLine; title: string; desc: string }[] = [
  { id: 'merge', Icon: FilePlus2, title: "Об'єднати PDF", desc: "Об'єднання кількох файлів в один PDF." },
  { id: 'compress', Icon: Minimize2, title: 'Стиснути PDF', desc: 'Зменште розмір PDF за кілька кроків.' },
  { id: 'edit', Icon: PenLine, title: 'Редагувати PDF', desc: 'Редагування PDF широким набором інструментів.' },
  { id: 'convert', Icon: ArrowLeftRight, title: 'Конвертувати PDF', desc: 'Швидка конвертація в PDF і з PDF.' },
  { id: 'split', Icon: Scissors, title: 'Розділити PDF', desc: 'Розділення великих PDF на менші файли.' },
];

const LINKS: { id: QuickToolId; label: string }[][] = [
  [
    { id: 'sign', label: 'Ел. підпис' },
    { id: 'pdf-to-word', label: 'PDF у Word' },
    { id: 'pdf-to-excel', label: 'PDF у Excel' },
  ],
  [
    { id: 'pdf-to-ppt', label: 'PDF у PPT' },
    { id: 'resize', label: 'Змінити розмір PDF' },
    { id: 'pdf-to-jpg', label: 'PDF у JPG' },
  ],
  [
    { id: 'rotate', label: 'Повернути PDF' },
    { id: 'ppt-to-pdf', label: 'PPT у PDF' },
    { id: 'excel-to-pdf', label: 'Excel у PDF' },
  ],
  [
    { id: 'word-to-pdf', label: 'Word у PDF' },
    { id: 'protect', label: 'Захистити PDF' },
    { id: 'unlock', label: 'Зняти захист з PDF' },
  ],
  [
    { id: 'read', label: 'Читання PDF' },
    { id: 'ocr', label: 'Розпізнати текст у PDF' },
  ],
  [
    { id: 'delete-pages', label: 'Видалити сторінки' },
    { id: 'watermark', label: 'Водяний знак' },
  ],
  [{ id: 'html-to-pdf', label: 'HTML у PDF' }],
];

export const PDFQuickToolsModal: React.FC = () => {
  const open = usePdfWorkspace((s) => s.quickToolsOpen);
  const setQuickToolsOpen = usePdfWorkspace((s) => s.setQuickToolsOpen);
  const setRibbonTab = usePdfWorkspace((s) => s.setRibbonTab);
  const [tool, setTool] = useState<QuickToolId | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [quality, setQuality] = useState<CompressQuality>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setQuickToolsOpen(false);
    setTool(null);
    setFiles([]);
    setStatus('');
  };

  const pick = (id: QuickToolId) => {
    if (id === 'edit' || id === 'read' || id === 'sign') {
      if (id === 'sign') setRibbonTab('esign');
      else setRibbonTab('edit');
      close();
      return;
    }
    if (id === 'ocr') {
      setRibbonTab('ocr');
      setTool('ocr');
      return;
    }
    setTool(id);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const runMerge = useCallback(async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let first = true;
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await fileToDataUrl(file);
          if (!first) doc.addPage();
          doc.addImage(dataUrl, 'JPEG', 10, 10, 190, 0);
          first = false;
        } else if (/\.pdf$/i.test(file.name)) {
          const n = await getPdfPageCount(file);
          for (let p = 1; p <= n; p += 1) {
            setStatus(`${file.name} ${p}/${n}`);
            const img = await renderPdfPageToDataUrl(file, p, 1.4, 0.85);
            if (!first) doc.addPage();
            doc.addImage(img, 'JPEG', 5, 5, 200, 0);
            first = false;
          }
        } else {
          const text = await file.text().catch(() => file.name);
          if (!first) doc.addPage();
          doc.setFontSize(11);
          doc.text(doc.splitTextToSize(text, 180), 15, 20);
          first = false;
        }
      }
      doc.save('merged.pdf');
    } finally {
      setBusy(false);
      setStatus('');
    }
  }, [files]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[1000px] bg-[#e8eaed] rounded-2xl shadow-2xl border border-[#d1d5db] my-4">
        <div className="flex items-center justify-between px-5 py-3 bg-white rounded-t-2xl border-b border-[#e5e7eb]">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">Швидкі інструменти</h2>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#64748b]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {PRIMARY.map(({ id, Icon, title, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className={`text-left bg-white rounded-xl p-4 min-h-[160px] shadow-sm border transition-all hover:shadow-md ${
                  tool === id ? 'border-[#3b82f6] ring-2 ring-[#3b82f6]/20' : 'border-transparent'
                }`}
              >
                <Icon className="text-[#3b82f6] mb-3" size={32} strokeWidth={1.5} />
                <p className="font-bold text-[14px] text-[#1a1f36] mb-1.5">{title}</p>
                <p className="text-[12px] text-[#5c6378] leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-2 mb-6">
            {LINKS.map((col, i) => (
              <div key={i} className="flex flex-col gap-2">
                {col.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pick(item.id)}
                    className={`text-left text-[13px] ${
                      tool === item.id ? 'text-[#2563eb] font-semibold' : 'text-[#1a1f36] hover:text-[#2563eb]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {tool && tool !== 'edit' && tool !== 'read' && tool !== 'sign' && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
              <p className="text-sm font-semibold text-[#0f172a] mb-3 capitalize">{tool}</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#c5cad3] rounded-xl py-8 text-center hover:border-[#3b82f6] mb-3"
              >
                <Upload className="mx-auto text-[#3b82f6] mb-2" size={24} />
                <span className="text-sm text-[#334155]">Додати файли</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept={
                  tool === 'word-to-pdf' || tool === 'excel-to-pdf' || tool === 'ppt-to-pdf'
                    ? '.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.pdf,image/*'
                    : tool === 'html-to-pdf'
                      ? '.html,.htm,.txt'
                      : '.pdf,image/*,.txt'
                }
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {files.length > 0 && (
                <ul className="text-xs text-[#475569] mb-3 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`}>{f.name}</li>
                  ))}
                </ul>
              )}

              {(tool === 'compress' || tool === 'resize') && (
                <div className="flex gap-2 mb-3">
                  {(['high', 'medium', 'low'] as CompressQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={`px-3 py-1 rounded-lg text-xs border ${
                        quality === q ? 'border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]' : 'border-[#e5e7eb]'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={busy || (tool !== 'html-to-pdf' && files.length === 0)}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      if (tool === 'merge' || tool === 'convert' || tool === 'word-to-pdf' || tool === 'excel-to-pdf' || tool === 'ppt-to-pdf' || tool === 'unlock') {
                        await runMerge();
                      } else if (tool === 'compress' || tool === 'resize' || tool === 'protect') {
                        await compressFilesToPdf(files, quality, 'compressed', setStatus);
                      } else if (tool === 'split') {
                        await splitPdfToPages(files[0], files[0].name, setStatus);
                      } else if (tool === 'pdf-to-jpg') {
                        await exportPdfPagesAsJpg(files[0], files[0].name, setStatus);
                      } else if (tool === 'rotate') {
                        await rotatePdfPages(files[0], 90, 'rotated', setStatus);
                      } else if (tool === 'watermark') {
                        await compressFilesToPdf(files, 'medium', 'watermarked', setStatus);
                      } else if (tool === 'pdf-to-word' || tool === 'pdf-to-excel' || tool === 'pdf-to-ppt') {
                        const n = await getPdfPageCount(files[0]);
                        const parts: string[] = [];
                        for (let p = 1; p <= n; p += 1) {
                          const page = await pdfjsLib
                            .getDocument({ data: await files[0].arrayBuffer() })
                            .promise.then((d) => d.getPage(p));
                          const content = await page.getTextContent();
                          parts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
                        }
                        const blob = new Blob([parts.join('\n\n')], { type: 'text/plain' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'export.txt';
                        a.click();
                      } else if (tool === 'html-to-pdf') {
                        const doc = new jsPDF();
                        const text = files[0] ? await files[0].text() : '<p>Document</p>';
                        doc.text(doc.splitTextToSize(text.replace(/<[^>]+>/g, ' '), 180), 15, 20);
                        doc.save('html.pdf');
                      } else if (tool === 'ocr') {
                        await openPdfFiles(null);
                      } else if (tool === 'delete-pages') {
                        await splitPdfToPages(files[0], 'page', setStatus);
                      }
                    } finally {
                      setBusy(false);
                      setStatus('');
                    }
                  })();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold disabled:opacity-40"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Виконати
              </button>
              {status && <p className="text-xs text-[#2563eb] mt-2">{status}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

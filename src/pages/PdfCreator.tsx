import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  FilePlus2,
  FileText,
  Loader2,
  Minimize2,
  PenLine,
  ArrowLeftRight,
  Scissors,
  Download,
  Upload,
  X,
  RotateCw,
  PenTool,
  ScanText,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { UniversalDocumentEditor } from '../components/documentEditor/UniversalDocumentEditor';
import { PdfOcrPanel } from '../components/PdfOcrPanel';
import { createQuickTemplate } from '../lib/documentEditor/templates';
import type { UniversalDocument } from '../lib/documentEditor/types';
import {
  compressFilesToPdf,
  exportPdfPagesAsJpg,
  getPdfPageCount,
  renderPdfPageToDataUrl,
  rotatePdfPages,
  splitPdfToPages,
  type CompressQuality,
  type RotateDegrees,
} from '../lib/documentEditor/pdfTools';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * Одна сторінка як у Soda PDF:
 * зверху 5 карток + сітка інструментів,
 * обраний інструмент відкривається панеллю НИЖЧЕ на тій же сторінці.
 */
type ToolId =
  | 'merge'
  | 'compress'
  | 'edit'
  | 'convert'
  | 'split'
  | 'sign'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-ppt'
  | 'resize'
  | 'pdf-to-jpg'
  | 'rotate'
  | 'ppt-to-pdf'
  | 'excel-to-pdf'
  | 'word-to-pdf'
  | 'protect'
  | 'unlock'
  | 'read'
  | 'ocr'
  | 'delete-pages'
  | 'watermark'
  | 'html-to-pdf';

type FileKind = 'image' | 'pdf' | 'other';

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: FileKind;
}

const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

function detectFileType(file: File): FileKind {
  if (IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(file.name)) {
    return 'image';
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  return 'other';
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const PRIMARY: {
  id: ToolId;
  Icon: typeof FileText;
  titleUk: string;
  descUk: string;
}[] = [
  {
    id: 'merge',
    Icon: FilePlus2,
    titleUk: "Об'єднати PDF",
    descUk: "Об'єднання кількох файлів в один PDF-документ.",
  },
  {
    id: 'compress',
    Icon: Minimize2,
    titleUk: 'Стиснути PDF',
    descUk: 'Зменште розмір PDF-файлу всього за кілька кроків.',
  },
  {
    id: 'edit',
    Icon: PenLine,
    titleUk: 'Редагувати PDF',
    descUk: 'Редагування PDF-файлів широким набором безкоштовних інструментів.',
  },
  {
    id: 'convert',
    Icon: ArrowLeftRight,
    titleUk: 'Конвертувати PDF',
    descUk: 'Швидка конвертація в PDF і конвертація з PDF-файлів.',
  },
  {
    id: 'split',
    Icon: Scissors,
    titleUk: 'Розділити PDF',
    descUk: 'Розділення великих PDF-файлів на окремі менші файли.',
  },
];

/** Сітка як на фото Soda — 7 колонок посилань */
const TOOL_COLUMNS: { id: ToolId; label: string }[][] = [
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

const TOOL_TITLE: Partial<Record<ToolId, string>> = {
  merge: "Об'єднати PDF",
  compress: 'Стиснути PDF',
  edit: 'Редагувати PDF',
  convert: 'Конвертувати PDF',
  split: 'Розділити PDF',
  sign: 'Ел. підпис',
  'pdf-to-word': 'PDF у Word',
  'pdf-to-excel': 'PDF у Excel',
  'pdf-to-ppt': 'PDF у PPT',
  resize: 'Змінити розмір PDF',
  'pdf-to-jpg': 'PDF у JPG',
  rotate: 'Повернути PDF',
  'ppt-to-pdf': 'PPT у PDF',
  'excel-to-pdf': 'Excel у PDF',
  'word-to-pdf': 'Word у PDF',
  protect: 'Захистити PDF',
  unlock: 'Зняти захист з PDF',
  read: 'Читання PDF',
  ocr: 'Розпізнати текст у PDF',
  'delete-pages': 'Видалити сторінки',
  watermark: 'Водяний знак',
  'html-to-pdf': 'HTML у PDF',
};

export default function PdfCreator() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToastContext();

  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [filename, setFilename] = useState('document');
  const [compressQuality, setCompressQuality] = useState<CompressQuality>('medium');
  const [rotateDeg, setRotateDeg] = useState<RotateDegrees>(90);
  const [watermarkText, setWatermarkText] = useState('SCB Light');
  const [htmlSource, setHtmlSource] = useState('<h1>Документ</h1><p>Текст…</p>');
  const [pageCount, setPageCount] = useState(0);
  const [pagesToDelete, setPagesToDelete] = useState<Set<number>>(new Set());
  const [bootDoc, setBootDoc] = useState<UniversalDocument | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [protectNote, setProtectNote] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const selectTool = (id: ToolId) => {
    setActiveTool(id);
    setFiles([]);
    setStatus('');
    setPagesToDelete(new Set());
    setPageCount(0);
    if (id === 'edit' || id === 'read') {
      setBootDoc(createQuickTemplate('blank'));
      setEditorKey((k) => k + 1);
    }
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const closePanel = () => {
    setActiveTool(null);
    setFiles([]);
    setStatus('');
  };

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const next: UploadedFile[] = [];
      for (const file of Array.from(incoming)) {
        if (file.size > 50 * 1024 * 1024) {
          showError(`${file.name}: макс. 50 МБ`);
          continue;
        }
        const type = detectFileType(file);
        let previewUrl: string | null = null;
        if (type === 'image') {
          try {
            previewUrl = await readAsDataURL(file);
          } catch {
            previewUrl = null;
          }
        }
        next.push({ id: Math.random().toString(36).slice(2), file, previewUrl, type });
        if (type === 'pdf') {
          try {
            setPageCount(await getPdfPageCount(file));
          } catch {
            setPageCount(0);
          }
        }
      }
      if (next.length) setFiles((prev) => [...prev, ...next]);
    },
    [showError],
  );

  useEffect(() => {
    if (activeTool !== 'sign') return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [activeTool]);

  const mergeToPdf = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      let first = true;
      for (const item of files) {
        if (item.type === 'image') {
          const dataUrl = item.previewUrl || (await readAsDataURL(item.file));
          const dims = await getImageDimensions(dataUrl);
          const ratio = dims.width / dims.height;
          let w = pageW - 20;
          let h = w / ratio;
          if (h > pageH - 20) {
            h = pageH - 20;
            w = h * ratio;
          }
          if (!first) doc.addPage();
          doc.addImage(dataUrl, dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
          first = false;
        } else if (item.type === 'pdf') {
          const count = await getPdfPageCount(item.file);
          for (let p = 1; p <= count; p += 1) {
            const imageData = await renderPdfPageToDataUrl(item.file, p, 2, 0.92);
            const dims = await getImageDimensions(imageData);
            const ratio = dims.width / dims.height;
            let w = pageW - 10;
            let h = w / ratio;
            if (h > pageH - 10) {
              h = pageH - 10;
              w = h * ratio;
            }
            if (!first) doc.addPage();
            doc.addImage(imageData, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
            first = false;
          }
        } else {
          const text = await item.file.text().catch(() => '');
          if (!first) doc.addPage();
          doc.setFontSize(11);
          const lines = doc.splitTextToSize(text || item.file.name, pageW - 30);
          let y = 20;
          for (const line of lines) {
            if (y > pageH - 20) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 15, y);
            y += 6;
          }
          first = false;
        }
      }
      doc.save(`${filename || 'document'}.pdf`);
      showSuccess("PDF об'єднано");
    } catch {
      showError('Не вдалося створити PDF');
    } finally {
      setBusy(false);
    }
  };

  const runCompress = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      await compressFilesToPdf(
        files.map((f) => f.file),
        compressQuality,
        `${filename || 'compressed'}_compressed`,
        setStatus,
      );
      showSuccess('PDF стиснуто');
    } catch {
      showError('Не вдалося стиснути');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runSplit = async () => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    setBusy(true);
    try {
      const n = await splitPdfToPages(pdf, filename || pdf.name, setStatus);
      showSuccess(`Розділено на ${n} файлів`);
    } catch {
      showError('Не вдалося розділити');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runJpg = async () => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    setBusy(true);
    try {
      const n = await exportPdfPagesAsJpg(pdf, filename || pdf.name, setStatus);
      showSuccess(`Збережено ${n} JPG`);
    } catch {
      showError('Помилка конвертації');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runRotate = async () => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    setBusy(true);
    try {
      await rotatePdfPages(pdf, rotateDeg, `${filename || 'rotated'}_rotated`, setStatus);
      showSuccess('PDF повернуто');
    } catch {
      showError('Не вдалося повернути');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runWatermark = async () => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    setBusy(true);
    try {
      const count = await getPdfPageCount(pdf);
      let doc: jsPDF | null = null;
      for (let p = 1; p <= count; p += 1) {
        setStatus(`Сторінка ${p}/${count}`);
        const imageData = await renderPdfPageToDataUrl(pdf, p, 1.6, 0.9);
        const dims = await getImageDimensions(imageData);
        const land = dims.width >= dims.height;
        if (!doc) doc = new jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: 'a4' });
        else doc.addPage('a4', land ? 'l' : 'p');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ratio = dims.width / dims.height;
        let w = pw - 8;
        let h = w / ratio;
        if (h > ph - 8) {
          h = ph - 8;
          w = h * ratio;
        }
        doc.addImage(imageData, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(28);
        doc.text(watermarkText || 'SCB', pw / 2, ph / 2, { align: 'center', angle: 35 });
      }
      doc?.save(`${filename || 'watermark'}_wm.pdf`);
      showSuccess('Водяний знак додано');
    } catch {
      showError('Не вдалося додати знак');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runDeletePages = async () => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    if (pagesToDelete.size === 0) {
      showError('Оберіть сторінки для видалення');
      return;
    }
    setBusy(true);
    try {
      const count = await getPdfPageCount(pdf);
      let doc: jsPDF | null = null;
      let kept = 0;
      for (let p = 1; p <= count; p += 1) {
        if (pagesToDelete.has(p)) continue;
        setStatus(`Сторінка ${p}/${count}`);
        const imageData = await renderPdfPageToDataUrl(pdf, p, 1.6, 0.92);
        const dims = await getImageDimensions(imageData);
        const land = dims.width >= dims.height;
        if (!doc) doc = new jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: 'a4' });
        else doc.addPage('a4', land ? 'l' : 'p');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ratio = dims.width / dims.height;
        let w = pw - 8;
        let h = w / ratio;
        if (h > ph - 8) {
          h = ph - 8;
          w = h * ratio;
        }
        doc.addImage(imageData, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
        kept += 1;
      }
      if (!doc || kept === 0) {
        showError('Немає сторінок для збереження');
        return;
      }
      doc.save(`${filename || 'trimmed'}.pdf`);
      showSuccess(`Збережено ${kept} стор.`);
    } catch {
      showError('Не вдалося видалити сторінки');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runHtmlToPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const text = htmlSource.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const lines = doc.splitTextToSize(text || ' ', 180);
    let y = 20;
    doc.setFontSize(12);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 7;
    }
    doc.save(`${filename || 'html'}.pdf`);
    showSuccess('HTML → PDF готово');
  };

  const runPdfToTextDoc = async (ext: 'doc' | 'xls' | 'ppt') => {
    const pdf = files.find((f) => f.type === 'pdf')?.file;
    if (!pdf) {
      showError('Додайте PDF');
      return;
    }
    setBusy(true);
    try {
      const count = await getPdfPageCount(pdf);
      const parts: string[] = [];
      for (let p = 1; p <= count; p += 1) {
        setStatus(`Сторінка ${p}/${count}`);
        const page = await pdfjsLib.getDocument({ data: await pdf.arrayBuffer() }).promise.then((d) => d.getPage(p));
        const content = await page.getTextContent();
        const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
        parts.push(`--- ${p} ---\n${text}`);
      }
      const blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename || 'export'}.${ext === 'doc' ? 'txt' : ext === 'xls' ? 'csv' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(a.href);
      showSuccess('Текст з PDF збережено (відкрийте у Word / Excel / PPT)');
    } catch {
      showError('Не вдалося витягнути текст');
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const runSign = async () => {
    const item = files[0];
    const canvas = signCanvasRef.current;
    if (!item || !canvas) {
      showError('Додайте файл і підпис');
      return;
    }
    setBusy(true);
    try {
      const sig = canvas.toDataURL('image/png');
      let pageImage: string;
      if (item.type === 'pdf') pageImage = await renderPdfPageToDataUrl(item.file, 1, 1.6, 0.92);
      else if (item.type === 'image') pageImage = item.previewUrl || (await readAsDataURL(item.file));
      else {
        showError('PDF або зображення');
        return;
      }
      const dims = await getImageDimensions(pageImage);
      const doc = new jsPDF({
        orientation: dims.width >= dims.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ratio = dims.width / dims.height;
      let w = pw - 10;
      let h = w / ratio;
      if (h > ph - 10) {
        h = ph - 10;
        w = h * ratio;
      }
      const x = (pw - w) / 2;
      const y = (ph - h) / 2;
      doc.addImage(pageImage, 'JPEG', x, y, w, h);
      doc.addImage(sig, 'PNG', x + w - 64, y + h - 30, 56, 20);
      doc.save(`${filename || 'signed'}_signed.pdf`);
      showSuccess('Підписано');
    } catch {
      showError('Помилка підпису');
    } finally {
      setBusy(false);
    }
  };

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const acceptForTool = (): string => {
    if (
      activeTool === 'split' ||
      activeTool === 'pdf-to-jpg' ||
      activeTool === 'rotate' ||
      activeTool === 'watermark' ||
      activeTool === 'delete-pages' ||
      activeTool === 'pdf-to-word' ||
      activeTool === 'pdf-to-excel' ||
      activeTool === 'pdf-to-ppt' ||
      activeTool === 'read' ||
      activeTool === 'resize' ||
      activeTool === 'protect' ||
      activeTool === 'unlock'
    ) {
      return '.pdf,application/pdf';
    }
    if (activeTool === 'sign') return 'image/*,.pdf';
    if (activeTool === 'word-to-pdf') return '.doc,.docx,.txt,.rtf';
    if (activeTool === 'excel-to-pdf') return '.xls,.xlsx,.csv';
    if (activeTool === 'ppt-to-pdf') return '.ppt,.pptx,.txt';
    return 'image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx';
  };

  const multipleForTool = activeTool === 'merge' || activeTool === 'compress' || activeTool === 'convert';

  const renderDropzone = () => (
    <div
      className="mb-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
      }}
    >
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-[#c5cad3] hover:border-[#3b82f6] rounded-xl bg-white px-6 py-10 text-center transition-colors"
      >
        <Upload className="mx-auto mb-3 text-[#3b82f6]" size={28} />
        <p className="text-[#1a1f36] font-medium text-sm">Перетягніть файли сюди або натисніть для вибору</p>
        <p className="text-[#6b7280] text-xs mt-1">До 50 МБ на файл</p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple={multipleForTool}
        accept={acceptForTool()}
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white border border-[#e5e7eb] px-3 py-2 text-sm"
            >
              <span className="truncate text-[#1a1f36]">{f.file.name}</span>
              <span className="text-[#9ca3af] text-xs shrink-0">{formatFileSize(f.file.size)}</span>
              <button
                type="button"
                className="text-[#9ca3af] hover:text-red-500"
                onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const actionBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-semibold px-5 py-3 text-sm transition-colors"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#e8eaed] text-[#1a1f36]">
      {/* Тонка шапка — назад на головну */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#dfe3e8] px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-[#f1f3f5] text-[#4b5563]"
          aria-label="Назад"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="text-[#3b82f6]" size={20} />
          <span className="font-semibold text-[15px]">{t('createPdfBtn') || 'PDF'}</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-8 md:py-10 pb-28">
        {/* ===== 5 карток як на фото ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {PRIMARY.map(({ id, Icon, titleUk, descUk }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              className={`text-left bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_14px_rgba(59,130,246,0.18)] border transition-all p-5 min-h-[200px] flex flex-col ${
                activeTool === id ? 'border-[#3b82f6] ring-2 ring-[#3b82f6]/20' : 'border-transparent'
              }`}
            >
              <div className="mb-5 text-[#3b82f6]">
                <Icon size={40} strokeWidth={1.5} />
              </div>
              <h2 className="font-bold text-[16px] leading-snug mb-2 text-[#1a1f36]">{titleUk}</h2>
              <p className="text-[13px] leading-relaxed text-[#5c6378] flex-1">{descUk}</p>
            </button>
          ))}
        </div>

        {/* ===== Сітка інструментів як на фото ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-3 mb-10">
          {TOOL_COLUMNS.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-2.5">
              {col.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTool(item.id)}
                  className={`text-left text-[14px] transition-colors ${
                    activeTool === item.id
                      ? 'text-[#2563eb] font-semibold'
                      : 'text-[#1a1f36] hover:text-[#2563eb]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ===== Панель інструмента на тій же сторінці ===== */}
        {activeTool && (
          <div
            ref={panelRef}
            id="pdf-tool-panel"
            className="rounded-2xl bg-white border border-[#dfe3e8] shadow-sm p-5 md:p-6 scroll-mt-20"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#1a1f36]">
                {TOOL_TITLE[activeTool] || activeTool}
              </h3>
              <button
                type="button"
                onClick={closePanel}
                className="p-2 rounded-lg hover:bg-[#f1f3f5] text-[#6b7280]"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </div>

            {(activeTool === 'edit' || activeTool === 'read') && (
              <div className="rounded-xl border border-[#e5e7eb] overflow-hidden bg-[#1e272e] -mx-1">
                <UniversalDocumentEditor
                  key={editorKey}
                  documentKey={String(editorKey)}
                  initialDocument={bootDoc}
                  onClose={closePanel}
                />
              </div>
            )}

            {activeTool === 'ocr' && (
              <div className="rounded-xl border border-[#e5e7eb] p-2 bg-[#1e272e]">
                <PdfOcrPanel
                  onOpenInEditor={(doc) => {
                    setBootDoc(doc);
                    setEditorKey((k) => k + 1);
                    setActiveTool('edit');
                  }}
                />
              </div>
            )}

            {activeTool === 'html-to-pdf' && (
              <div className="space-y-3">
                <textarea
                  value={htmlSource}
                  onChange={(e) => setHtmlSource(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm font-mono"
                />
                <input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full sm:w-64 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm"
                  placeholder="filename"
                />
                {actionBtn('HTML → PDF', runHtmlToPdf)}
              </div>
            )}

            {activeTool &&
              activeTool !== 'edit' &&
              activeTool !== 'read' &&
              activeTool !== 'ocr' &&
              activeTool !== 'html-to-pdf' && (
                <>
                  {renderDropzone()}

                  {(activeTool === 'merge' ||
                    activeTool === 'compress' ||
                    activeTool === 'convert' ||
                    activeTool === 'word-to-pdf' ||
                    activeTool === 'excel-to-pdf' ||
                    activeTool === 'ppt-to-pdf') && (
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm w-48"
                      />
                      <span className="text-[#9ca3af] text-sm">.pdf</span>
                      {actionBtn(
                        activeTool === 'compress' ? 'Стиснути' : "Об'єднати в PDF",
                        () => void (activeTool === 'compress' ? runCompress() : mergeToPdf()),
                        files.length === 0,
                      )}
                    </div>
                  )}

                  {activeTool === 'compress' && (
                    <div className="flex gap-2 mb-4">
                      {(['high', 'medium', 'low'] as CompressQuality[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setCompressQuality(q)}
                          className={`px-3 py-1.5 rounded-lg text-sm border ${
                            compressQuality === q
                              ? 'bg-[#eff6ff] border-[#3b82f6] text-[#1d4ed8]'
                              : 'border-[#e5e7eb] text-[#6b7280]'
                          }`}
                        >
                          {q === 'high' ? 'Висока' : q === 'medium' ? 'Середня' : 'Сильна'}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTool === 'resize' && (
                    <div className="space-y-3">
                      <p className="text-sm text-[#6b7280]">Зменшення розміру через стиснення сторінок.</p>
                      <div className="flex gap-2">
                        {(['high', 'medium', 'low'] as CompressQuality[]).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setCompressQuality(q)}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${
                              compressQuality === q
                                ? 'bg-[#eff6ff] border-[#3b82f6] text-[#1d4ed8]'
                                : 'border-[#e5e7eb] text-[#6b7280]'
                            }`}
                          >
                            {q === 'high' ? 'Легко' : q === 'medium' ? 'Середньо' : 'Макс.'}
                          </button>
                        ))}
                      </div>
                      {actionBtn('Змінити розмір', () => void runCompress(), files.length === 0)}
                    </div>
                  )}

                  {activeTool === 'split' && actionBtn('Розділити на сторінки', () => void runSplit(), files.length === 0)}
                  {activeTool === 'pdf-to-jpg' && actionBtn('PDF → JPG', () => void runJpg(), files.length === 0)}

                  {activeTool === 'rotate' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {([90, 180, 270] as RotateDegrees[]).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setRotateDeg(d)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
                              rotateDeg === d
                                ? 'bg-[#eff6ff] border-[#3b82f6] text-[#1d4ed8]'
                                : 'border-[#e5e7eb] text-[#6b7280]'
                            }`}
                          >
                            <RotateCw size={14} /> {d}°
                          </button>
                        ))}
                      </div>
                      {actionBtn('Повернути', () => void runRotate(), files.length === 0)}
                    </div>
                  )}

                  {(activeTool === 'pdf-to-word' || activeTool === 'pdf-to-excel' || activeTool === 'pdf-to-ppt') &&
                    actionBtn(
                      'Витягнути текст',
                      () =>
                        void runPdfToTextDoc(
                          activeTool === 'pdf-to-word' ? 'doc' : activeTool === 'pdf-to-excel' ? 'xls' : 'ppt',
                        ),
                      files.length === 0,
                    )}

                  {activeTool === 'watermark' && (
                    <div className="space-y-3">
                      <input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm w-full sm:w-64"
                        placeholder="Текст знака"
                      />
                      {actionBtn('Додати водяний знак', () => void runWatermark(), files.length === 0)}
                    </div>
                  )}

                  {activeTool === 'delete-pages' && (
                    <div className="space-y-3">
                      {pageCount > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                setPagesToDelete((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(p)) next.delete(p);
                                  else next.add(p);
                                  return next;
                                })
                              }
                              className={`w-10 h-10 rounded-lg text-sm font-medium border ${
                                pagesToDelete.has(p)
                                  ? 'bg-red-50 border-red-400 text-red-600'
                                  : 'border-[#e5e7eb] text-[#4b5563]'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#6b7280]">Спочатку завантажте PDF</p>
                      )}
                      <p className="text-xs text-[#9ca3af]">Червоні сторінки буде видалено</p>
                      {actionBtn('Видалити й зберегти', () => void runDeletePages(), files.length === 0)}
                    </div>
                  )}

                  {activeTool === 'sign' && (
                    <div className="space-y-3">
                      <p className="text-sm text-[#6b7280] flex items-center gap-2">
                        <PenTool size={14} className="text-[#3b82f6]" /> Намалюйте підпис
                      </p>
                      <canvas
                        ref={signCanvasRef}
                        width={560}
                        height={160}
                        className="w-full h-36 rounded-xl border border-[#d1d5db] bg-white touch-none cursor-crosshair"
                        onPointerDown={(e) => {
                          const canvas = signCanvasRef.current;
                          const ctx = canvas?.getContext('2d');
                          if (!canvas || !ctx) return;
                          drawingRef.current = true;
                          canvas.setPointerCapture(e.pointerId);
                          const { x, y } = pointerPos(e);
                          ctx.beginPath();
                          ctx.moveTo(x, y);
                        }}
                        onPointerMove={(e) => {
                          if (!drawingRef.current) return;
                          const ctx = signCanvasRef.current?.getContext('2d');
                          if (!ctx) return;
                          const { x, y } = pointerPos(e);
                          ctx.lineTo(x, y);
                          ctx.stroke();
                        }}
                        onPointerUp={() => {
                          drawingRef.current = false;
                        }}
                      />
                      {actionBtn('Завантажити підписаний PDF', () => void runSign(), files.length === 0)}
                    </div>
                  )}

                  {(activeTool === 'protect' || activeTool === 'unlock') && (
                    <div className="space-y-3">
                      <p className="text-sm text-[#6b7280]">
                        {activeTool === 'protect'
                          ? 'Додайте примітку / позначку захисту на сторінках (клієнтський захист).'
                          : 'Зніміть клієнтську позначку — експортуйте чистий PDF.'}
                      </p>
                      {activeTool === 'protect' && (
                        <input
                          value={protectNote}
                          onChange={(e) => setProtectNote(e.target.value)}
                          placeholder="Конфіденційно"
                          className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm w-full sm:w-64"
                        />
                      )}
                      {actionBtn(
                        activeTool === 'protect' ? 'Позначити й зберегти' : 'Експортувати PDF',
                        () => {
                          if (activeTool === 'protect') {
                            setWatermarkText(protectNote || 'CONFIDENTIAL');
                            void runWatermark();
                          } else {
                            void mergeToPdf();
                          }
                        },
                        files.length === 0,
                      )}
                    </div>
                  )}

                  {status && (
                    <p className="mt-3 text-sm text-[#2563eb] flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> {status}
                    </p>
                  )}
                </>
              )}

            {activeTool === 'convert' && files.length === 0 && (
              <p className="text-sm text-[#6b7280] mt-2 flex items-start gap-2">
                <ScanText size={16} className="mt-0.5 text-[#3b82f6] shrink-0" />
                Або оберіть знизу: PDF у JPG, Word у PDF, Excel у PDF, OCR…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

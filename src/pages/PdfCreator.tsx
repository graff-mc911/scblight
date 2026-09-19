import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  FileCheck,
  FileText,
  Layers,
  Loader2,
  Minimize2,
  PenLine,
  RefreshCw,
  ScanText,
  Scissors,
  Download,
  Image as ImageIcon,
  RotateCw,
  PenTool,
  Layout,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { UniversalDocumentEditor } from '../components/documentEditor/UniversalDocumentEditor';
import { PdfOcrPanel } from '../components/PdfOcrPanel';
import {
  PdfFileDropzone,
  type PdfDropFile,
  type PdfDropFileKind,
} from '../components/documentEditor/PdfFileDropzone';
import {
  createQuickTemplate,
  type QuickTemplateId,
} from '../lib/documentEditor/templates';
import type { UniversalDocument } from '../lib/documentEditor/types';
import {
  compressFilesToPdf,
  exportPdfPagesAsJpg,
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

/** Інструменти як у Soda PDF: хаб → окремий робочий екран */
type ToolId =
  | 'hub'
  | 'merge'
  | 'compress'
  | 'edit'
  | 'convert'
  | 'split'
  | 'ocr'
  | 'pdf-to-jpg'
  | 'rotate'
  | 'sign'
  | 'templates';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

function detectFileType(file: File): PdfDropFileKind {
  if (IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic|heif)$/i.test(file.name)) {
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

const PRIMARY_TOOLS: {
  id: ToolId;
  icon: typeof PenLine;
  titleKey: string;
  descKey: string;
}[] = [
  { id: 'merge', icon: Layers, titleKey: 'pdfToolMerge', descKey: 'pdfToolMergeDesc' },
  { id: 'compress', icon: Minimize2, titleKey: 'pdfToolCompress', descKey: 'pdfToolCompressDesc' },
  { id: 'edit', icon: PenLine, titleKey: 'pdfToolEdit', descKey: 'pdfToolEditDesc' },
  { id: 'convert', icon: RefreshCw, titleKey: 'pdfToolConvert', descKey: 'pdfToolConvertDesc' },
  { id: 'split', icon: Scissors, titleKey: 'pdfToolSplit', descKey: 'pdfToolSplitDesc' },
];

const SECONDARY_TOOLS: { id: ToolId; labelKey: string }[] = [
  { id: 'sign', labelKey: 'pdfToolSign' },
  { id: 'templates', labelKey: 'pdfToolTemplates' },
  { id: 'pdf-to-jpg', labelKey: 'pdfToolPdfToJpg' },
  { id: 'rotate', labelKey: 'pdfToolRotate' },
  { id: 'ocr', labelKey: 'pdfToolOcr' },
  { id: 'edit', labelKey: 'pdfToolBlankDoc' },
];

const QUICK_TEMPLATES: {
  id: QuickTemplateId;
  icon: typeof FileText;
  titleKey: string;
  descKey: string;
}[] = [
  { id: 'blank', icon: PenLine, titleKey: 'pdfTplBlank', descKey: 'pdfTplBlankDesc' },
  { id: 'act', icon: FileCheck, titleKey: 'pdfTplAct', descKey: 'pdfTplActDesc' },
  { id: 'letter', icon: FileText, titleKey: 'pdfTplLetter', descKey: 'pdfTplLetterDesc' },
  { id: 'presentation', icon: Layout, titleKey: 'pdfTplPresentation', descKey: 'pdfTplPresentationDesc' },
  { id: 'receipt', icon: FileText, titleKey: 'pdfTplReceipt', descKey: 'pdfTplReceiptDesc' },
];

const TOOL_TITLES: Record<Exclude<ToolId, 'hub'>, string> = {
  merge: 'pdfToolMerge',
  compress: 'pdfToolCompress',
  edit: 'pdfToolEdit',
  convert: 'pdfToolConvert',
  split: 'pdfToolSplit',
  ocr: 'pdfToolOcr',
  'pdf-to-jpg': 'pdfToolPdfToJpg',
  rotate: 'pdfToolRotate',
  sign: 'pdfToolSign',
  templates: 'pdfToolTemplates',
};

export default function PdfCreator() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToastContext();

  const [tool, setTool] = useState<ToolId>('hub');
  const [bootDoc, setBootDoc] = useState<UniversalDocument | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [files, setFiles] = useState<PdfDropFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('document');
  const [compressQuality, setCompressQuality] = useState<CompressQuality>('medium');
  const [statusMsg, setStatusMsg] = useState('');
  const [rotateDeg, setRotateDeg] = useState<RotateDegrees>(90);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const openInEditor = (doc: UniversalDocument) => {
    setBootDoc(doc);
    setEditorKey((k) => k + 1);
    setTool('edit');
  };

  const openTemplate = (id: QuickTemplateId) => {
    openInEditor(createQuickTemplate(id));
  };

  const goHub = () => {
    setTool('hub');
    setFiles([]);
    setStatusMsg('');
    setBootDoc(null);
    setSignatureDataUrl(null);
  };

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const next: PdfDropFile[] = [];
      for (const file of Array.from(incoming)) {
        if (file.size > 50 * 1024 * 1024) {
          showError(`${file.name}: файл завеликий (макс. 50 МБ)`);
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
      }
      if (next.length > 0) setFiles((prev) => [...prev, ...next]);
    },
    [showError],
  );

  const handleMergeGenerate = useCallback(async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      let isFirstPage = true;

      for (const item of files) {
        if (item.type === 'image') {
          const dataUrl = item.previewUrl || (await readAsDataURL(item.file));
          const dimensions = await getImageDimensions(dataUrl);
          const ratio = dimensions.width / dimensions.height;
          let width = pageWidth - 20;
          let height = width / ratio;
          if (height > pageHeight - 20) {
            height = pageHeight - 20;
            width = height * ratio;
          }
          const x = (pageWidth - width) / 2;
          const y = (pageHeight - height) / 2;
          const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          if (!isFirstPage) doc.addPage();
          doc.addImage(dataUrl, format, x, y, width, height);
          isFirstPage = false;
        } else if (item.type === 'pdf') {
          const arrayBuffer = await item.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
            const imageData = await renderPdfPageToDataUrl(item.file, pageNum, 2, 0.92);
            const dimensions = await getImageDimensions(imageData);
            const ratio = dimensions.width / dimensions.height;
            let width = pageWidth - 10;
            let height = width / ratio;
            if (height > pageHeight - 10) {
              height = pageHeight - 10;
              width = height * ratio;
            }
            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;
            if (!isFirstPage) doc.addPage();
            doc.addImage(imageData, 'JPEG', x, y, width, height);
            isFirstPage = false;
          }
        } else {
          const text = await item.file.text().catch(() => null);
          if (text !== null) {
            if (!isFirstPage) doc.addPage();
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 30);
            const lines = doc.splitTextToSize(text, pageWidth - 30);
            let y = 20;
            for (const line of lines) {
              if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
              }
              doc.text(line, 15, y);
              y += 6;
            }
            isFirstPage = false;
          }
        }
      }

      doc.save(`${uploadFilename || 'document'}.pdf`);
      showSuccess(t('pdfMergedOk') || 'PDF успішно обʼєднано!');
    } catch {
      showError(t('pdfMergeFailed') || 'Не вдалося створити PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [files, uploadFilename, showError, showSuccess, t]);

  const handleCompress = useCallback(async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    setStatusMsg('');
    try {
      await compressFilesToPdf(
        files.map((f) => f.file),
        compressQuality,
        `${uploadFilename || 'compressed'}_compressed`,
        setStatusMsg,
      );
      showSuccess(t('pdfCompressed') || 'PDF compressed and downloaded');
    } catch {
      showError(t('pdfCompressFailed') || 'Could not compress PDF');
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  }, [files, compressQuality, uploadFilename, showError, showSuccess, t]);

  const handleSplit = useCallback(async () => {
    const pdfFile = files.find((f) => f.type === 'pdf')?.file;
    if (!pdfFile) {
      showError(t('pdfNeedPdf') || 'Додайте PDF-файл');
      return;
    }
    setIsGenerating(true);
    try {
      const n = await splitPdfToPages(pdfFile, uploadFilename || pdfFile.name, setStatusMsg);
      showSuccess((t('pdfSplitOk') || 'Розділено на {n} файлів').replace('{n}', String(n)));
    } catch {
      showError(t('pdfSplitFailed') || 'Не вдалося розділити PDF');
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  }, [files, uploadFilename, showError, showSuccess, t]);

  const handlePdfToJpg = useCallback(async () => {
    const pdfFile = files.find((f) => f.type === 'pdf')?.file;
    if (!pdfFile) {
      showError(t('pdfNeedPdf') || 'Додайте PDF-файл');
      return;
    }
    setIsGenerating(true);
    try {
      const n = await exportPdfPagesAsJpg(pdfFile, uploadFilename || pdfFile.name, setStatusMsg);
      showSuccess((t('pdfJpgOk') || 'Збережено {n} зображень').replace('{n}', String(n)));
    } catch {
      showError(t('pdfJpgFailed') || 'Не вдалося конвертувати');
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  }, [files, uploadFilename, showError, showSuccess, t]);

  const handleRotate = useCallback(async () => {
    const pdfFile = files.find((f) => f.type === 'pdf')?.file;
    if (!pdfFile) {
      showError(t('pdfNeedPdf') || 'Додайте PDF-файл');
      return;
    }
    setIsGenerating(true);
    try {
      await rotatePdfPages(pdfFile, rotateDeg, `${uploadFilename || 'rotated'}_rotated`, setStatusMsg);
      showSuccess(t('pdfRotateOk') || 'PDF повернуто і завантажено');
    } catch {
      showError(t('pdfRotateFailed') || 'Не вдалося повернути PDF');
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  }, [files, rotateDeg, uploadFilename, showError, showSuccess, t]);

  const initSignCanvas = useCallback(() => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const clearSignature = () => {
    initSignCanvas();
    setSignatureDataUrl(null);
  };

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleSignDownload = useCallback(async () => {
    const pdfOrImage = files[0];
    if (!pdfOrImage) {
      showError(t('pdfNeedFile') || 'Додайте файл');
      return;
    }
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const sig = canvas.toDataURL('image/png');
    setIsGenerating(true);
    try {
      let pageImage: string;
      if (pdfOrImage.type === 'pdf') {
        pageImage = await renderPdfPageToDataUrl(pdfOrImage.file, 1, 1.6, 0.92);
      } else if (pdfOrImage.type === 'image') {
        pageImage = pdfOrImage.previewUrl || (await readAsDataURL(pdfOrImage.file));
      } else {
        showError(t('pdfNeedPdfOrImage') || 'Потрібен PDF або зображення');
        return;
      }

      const dims = await getImageDimensions(pageImage);
      const doc = new jsPDF({
        orientation: dims.width >= dims.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = dims.width / dims.height;
      let w = pageW - 10;
      let h = w / ratio;
      if (h > pageH - 10) {
        h = pageH - 10;
        w = h * ratio;
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      doc.addImage(pageImage, 'JPEG', x, y, w, h);
      const sigW = Math.min(60, w * 0.35);
      const sigH = 22;
      doc.addImage(sig, 'PNG', x + w - sigW - 4, y + h - sigH - 8, sigW, sigH);
      doc.save(`${uploadFilename || 'signed'}_signed.pdf`);
      showSuccess(t('pdfSignOk') || 'Підписаний PDF завантажено');
      setSignatureDataUrl(sig);
    } catch {
      showError(t('pdfSignFailed') || 'Не вдалося підписати');
    } finally {
      setIsGenerating(false);
    }
  }, [files, uploadFilename, showError, showSuccess, t]);

  const filenameRow = (
    <div className="mt-3 flex gap-2 items-center">
      <input
        type="text"
        value={uploadFilename}
        onChange={(e) => setUploadFilename(e.target.value)}
        placeholder="document"
        className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
      />
      <span className="text-white/30 text-sm">.pdf</span>
    </div>
  );

  const primaryAction = (
    label: string,
    onClick: () => void,
    disabled?: boolean,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isGenerating}
      className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl mt-4 transition-colors"
    >
      {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      {label}
    </button>
  );

  /* ─── HUB (як головна Soda PDF) ─── */
  if (tool === 'hub') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              {t('pdfEditorTitle') || 'PDF'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {t('pdfHubTagline') || 'Простий редактор PDF і файлів — оберіть інструмент'}
            </p>
          </div>
        </div>

        {/* 5 основних карток */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-10">
          {PRIMARY_TOOLS.map(({ id, icon: Icon, titleKey, descKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              className="group text-left rounded-2xl bg-[#f4f6f8] hover:bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-all border border-white/0 hover:border-sky-200 min-h-[168px] flex flex-col"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
                <Icon size={26} className="text-sky-600" strokeWidth={1.75} />
              </div>
              <p className="text-[#1a1f36] font-semibold text-[15px] leading-snug mb-2">
                {t(titleKey)}
              </p>
              <p className="text-[#5c6378] text-xs leading-relaxed flex-1">{t(descKey)}</p>
            </button>
          ))}
        </div>

        {/* Другорядні інструменти — сітка посилань */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-5 md:px-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4 font-medium">
            {t('pdfMoreTools') || 'Більше інструментів'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-3">
            {SECONDARY_TOOLS.map((item) => (
              <button
                key={`${item.id}-${item.labelKey}`}
                type="button"
                onClick={() => setTool(item.id)}
                className="text-left text-sm text-white/70 hover:text-sky-300 transition-colors py-1"
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── EDIT: універсальний редактор ─── */
  if (tool === 'edit') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={goHub}
            className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-white">{t('pdfToolEdit')}</h2>
            <p className="text-white/45 text-sm">{t('pdfEditorSubtitle')}</p>
          </div>
        </div>

        {/* Стрічка режимів як у Soda */}
        <div className="flex flex-wrap gap-1 mb-4 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
          {(
            [
              ['edit', 'pdfRibbonEdit'],
              ['sign', 'pdfRibbonSign'],
              ['convert', 'pdfRibbonConvert'],
              ['ocr', 'pdfRibbonOcr'],
              ['templates', 'pdfRibbonTemplates'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                id === 'edit'
                  ? 'bg-sky-500/25 text-sky-200'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        <UniversalDocumentEditor
          key={editorKey}
          documentKey={String(editorKey)}
          initialDocument={bootDoc}
          onClose={goHub}
        />
      </div>
    );
  }

  /* ─── OCR ─── */
  if (tool === 'ocr') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-3xl">
        <ToolHeader title={t(TOOL_TITLES.ocr)} onBack={goHub} />
        <PdfOcrPanel onOpenInEditor={openInEditor} />
      </div>
    );
  }

  /* ─── TEMPLATES ─── */
  if (tool === 'templates') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-3xl">
        <ToolHeader title={t(TOOL_TITLES.templates)} onBack={goHub} />
        <p className="text-white/45 text-sm mb-5">{t('pdfQuickTemplatesHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => openTemplate(tpl.id)}
              className="text-left p-4 rounded-2xl bg-white/8 border border-white/10 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                  <tpl.icon size={20} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t(tpl.titleKey)}</p>
                  <p className="text-white/45 text-xs mt-1">{t(tpl.descKey)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── CONVERT hub ─── */
  if (tool === 'convert') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-3xl">
        <ToolHeader title={t(TOOL_TITLES.convert)} onBack={goHub} />
        <div className="space-y-3">
          {(
            [
              ['merge', Layers, 'pdfFilesToPdf', 'pdfFilesToPdfHint'],
              ['pdf-to-jpg', ImageIcon, 'pdfToolPdfToJpg', 'pdfToolPdfToJpgDesc'],
              ['templates', FileText, 'pdfToolTemplates', 'pdfQuickTemplatesHint'],
              ['ocr', ScanText, 'pdfToolOcr', 'pdfToolOcrDesc'],
            ] as const
          ).map(([id, Icon, titleKey, descKey]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              className="w-full flex items-start gap-4 p-4 rounded-2xl bg-white/8 border border-white/10 hover:border-sky-500/40 text-left transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                <Icon size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-white font-medium">{t(titleKey)}</p>
                <p className="text-white/45 text-sm mt-1">{t(descKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── SIGN ─── */
  if (tool === 'sign') {
    return (
      <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-3xl">
        <ToolHeader title={t(TOOL_TITLES.sign)} onBack={goHub} />
        <p className="text-white/45 text-sm mb-4">
          {t('pdfSignHint') || 'Завантажте PDF або фото, намалюйте підпис і завантажте результат'}
        </p>
        <PdfFileDropzone
          files={files}
          onAdd={(f) => void addFiles(f)}
          onRemove={(id) => setFiles(files.filter((x) => x.id !== id))}
          onClear={() => setFiles([])}
          accept="image/*,.pdf"
          hint="PDF або зображення (перша сторінка)"
          multiple={false}
        />
        <div className="rounded-2xl bg-white/8 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/70 text-sm flex items-center gap-2">
              <PenTool size={16} className="text-sky-400" />
              {t('pdfYourSignature') || 'Ваш підпис'}
            </p>
            <button type="button" onClick={clearSignature} className="text-xs text-white/40 hover:text-white">
              {t('clear') || 'Очистити'}
            </button>
          </div>
          <canvas
            ref={(el) => {
              signCanvasRef.current = el;
              if (el && !signatureDataUrl) {
                // init once mounted
                requestAnimationFrame(() => initSignCanvas());
              }
            }}
            width={560}
            height={180}
            className="w-full h-36 rounded-xl bg-white touch-none cursor-crosshair"
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
              const canvas = signCanvasRef.current;
              const ctx = canvas?.getContext('2d');
              if (!canvas || !ctx) return;
              const { x, y } = pointerPos(e);
              ctx.lineTo(x, y);
              ctx.stroke();
            }}
            onPointerUp={() => {
              drawingRef.current = false;
            }}
          />
        </div>
        {filenameRow}
        {primaryAction(
          t('pdfSignDownload') || 'Завантажити підписаний PDF',
          () => void handleSignDownload(),
          files.length === 0,
        )}
      </div>
    );
  }

  /* ─── MERGE / COMPRESS / SPLIT / PDF→JPG / ROTATE ─── */
  const isPdfOnly = tool === 'split' || tool === 'pdf-to-jpg' || tool === 'rotate';

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-3xl">
      <ToolHeader title={t(TOOL_TITLES[tool])} onBack={goHub} />

      <PdfFileDropzone
        files={files}
        onAdd={(f) => void addFiles(f)}
        onRemove={(id) => setFiles(files.filter((x) => x.id !== id))}
        onClear={() => setFiles([])}
        accept={isPdfOnly ? '.pdf,application/pdf' : 'image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv'}
        hint={isPdfOnly ? 'Лише PDF — до 50 МБ' : 'PDF, зображення, текст — до 50 МБ'}
        multiple={tool === 'merge' || tool === 'compress'}
      />

      {filenameRow}

      {tool === 'compress' && (
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/70 text-sm mb-3">{t('pdfCompressQuality') || 'Якість стиснення'}</p>
          <div className="flex gap-2">
            {(
              [
                ['high', t('pdfQualityHigh') || 'Висока'],
                ['medium', t('pdfQualityMedium') || 'Середня'],
                ['low', t('pdfQualityLow') || 'Сильна'],
              ] as const
            ).map(([q, label]) => (
              <button
                key={q}
                type="button"
                onClick={() => setCompressQuality(q)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  compressQuality === q
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tool === 'rotate' && (
        <div className="mt-4 flex gap-2">
          {([90, 180, 270] as RotateDegrees[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRotateDeg(d)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${
                rotateDeg === d
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              <RotateCw size={14} /> {d}°
            </button>
          ))}
        </div>
      )}

      {statusMsg && (
        <p className="text-sky-300 text-xs mt-3 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> {statusMsg}
        </p>
      )}

      {tool === 'merge' &&
        primaryAction(
          files.length === 0 ? t('pdfAddFiles') || 'Додайте файли' : `${t('pdfMergeAction') || "Об'єднати"} (${files.length})`,
          () => void handleMergeGenerate(),
          files.length === 0,
        )}
      {tool === 'compress' &&
        primaryAction(
          t('pdfCompressAction') || 'Стиснути PDF',
          () => void handleCompress(),
          files.length === 0,
        )}
      {tool === 'split' &&
        primaryAction(t('pdfSplitAction') || 'Розділити на сторінки', () => void handleSplit(), files.length === 0)}
      {tool === 'pdf-to-jpg' &&
        primaryAction(t('pdfJpgAction') || 'PDF → JPG', () => void handlePdfToJpg(), files.length === 0)}
      {tool === 'rotate' &&
        primaryAction(t('pdfRotateAction') || 'Повернути PDF', () => void handleRotate(), files.length === 0)}
    </div>
  );
}

function ToolHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        type="button"
        onClick={onBack}
        className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white"
      >
        <ArrowLeft size={18} />
      </button>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

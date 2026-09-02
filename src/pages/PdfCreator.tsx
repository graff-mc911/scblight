import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  FileCheck,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Loader2,
  Minimize2,
  PenLine,
  RefreshCw,
  ScanText,
  Trash2,
  Upload,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { UniversalDocumentEditor } from '../components/documentEditor/UniversalDocumentEditor';
import { PdfOcrPanel } from '../components/documentEditor/PdfOcrPanel';
import {
  createQuickTemplate,
  type QuickTemplateId,
} from '../lib/documentEditor/templates';
import type { UniversalDocument } from '../lib/documentEditor/types';
import {
  compressFilesToPdf,
  type CompressQuality,
  renderPdfPageToDataUrl,
} from '../lib/documentEditor/pdfTools';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Режими як у Soda PDF */
type HubMode = 'edit' | 'merge' | 'convert' | 'ocr';

type FileKind = 'image' | 'pdf' | 'other';

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: FileKind;
}

const HUB_TABS: { id: HubMode; label: string; icon: typeof PenLine }[] = [
  { id: 'edit', label: 'Редагування', icon: PenLine },
  { id: 'merge', label: "Об'єднання", icon: Layers },
  { id: 'convert', label: 'Перетворення', icon: RefreshCw },
  { id: 'ocr', label: 'OCR', icon: ScanText },
];

const QUICK_TEMPLATES: { id: QuickTemplateId; icon: typeof FileText; title: string; desc: string }[] = [
  { id: 'blank', icon: PenLine, title: 'Порожній документ', desc: 'Почніть з нуля в редакторі' },
  { id: 'act', icon: FileCheck, title: 'Акт робіт', desc: 'Шаблон прийому-передачі' },
  { id: 'letter', icon: FileText, title: 'Офіційний лист', desc: 'Ділове звернення' },
  { id: 'presentation', icon: RefreshCw, title: 'Презентація', desc: 'Слайди в редакторі' },
  { id: 'receipt', icon: FileText, title: 'Чек', desc: 'Проста квитанція' },
];

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

function detectFileType(file: File): FileKind {
  if (
    IMAGE_TYPES.includes(file.type) ||
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic|heif)$/i.test(file.name)
  ) {
    return 'image';
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return 'pdf';
  }
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

async function renderPdfPageToImage(file: File, pageNum: number): Promise<string> {
  return renderPdfPageToDataUrl(file, pageNum, 2, 0.92);
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfCreator() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToastContext();

  const [hubMode, setHubMode] = useState<HubMode>('edit');
  const [bootDoc, setBootDoc] = useState<UniversalDocument | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('document');
  const [compressQuality, setCompressQuality] = useState<CompressQuality>('medium');
  const [compressStatus, setCompressStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openInEditor = (doc: UniversalDocument) => {
    setBootDoc(doc);
    setEditorKey((k) => k + 1);
    setHubMode('edit');
  };

  const openTemplate = (id: QuickTemplateId) => {
    openInEditor(createQuickTemplate(id));
  };

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const next: UploadedFile[] = [];
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
            const imageData = await renderPdfPageToImage(item.file, pageNum);
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
      showSuccess('PDF успішно обʼєднано!');
    } catch {
      showError('Не вдалося створити PDF. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
  }, [files, uploadFilename, showError, showSuccess]);

  const handleCompress = useCallback(async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    setCompressStatus('');
    try {
      await compressFilesToPdf(
        files.map((f) => f.file),
        compressQuality,
        `${uploadFilename || 'compressed'}_compressed`,
        setCompressStatus,
      );
      showSuccess('PDF стиснуто і завантажено!');
    } catch {
      showError('Не вдалося стиснути PDF.');
    } finally {
      setIsGenerating(false);
      setCompressStatus('');
    }
  }, [files, compressQuality, uploadFilename, showError, showSuccess]);

  const typeIcon = {
    image: <ImageIcon size={18} className="text-blue-400" />,
    pdf: <FileText size={18} className="text-red-400" />,
    other: <FileText size={18} className="text-white/50" />,
  };

  const hubSubtitle: Record<HubMode, string> = {
    edit: 'Універсальний редактор: документ, презентація, книга — збереження в додатку та на пристрій',
    merge: "Об'єднайте PDF, фото та текстові файли в один документ",
    convert: 'Швидкі шаблони та перетворення файлів',
    ocr: 'Розпізнайте текст зі скану, фото або PDF-сторінок',
  };

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 mx-auto max-w-7xl">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {t('createPdfBtn') || 'PDF інструменти'}
          </h2>
          <p className="text-white/50 text-sm mt-0.5">{hubSubtitle[hubMode]}</p>
        </div>
      </div>

      {/* Soda PDF–style tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {HUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setHubMode(id)}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
              hubMode === id
                ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Редагування — головний режим */}
      {hubMode === 'edit' && (
        <UniversalDocumentEditor
          key={editorKey}
          documentKey={String(editorKey)}
          initialDocument={bootDoc}
        />
      )}

      {/* Об'єднання файлів */}
      {hubMode === 'merge' && (
        <div className="max-w-3xl mx-auto">
          <div
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${
              isDragging
                ? 'border-orange-400/60 bg-orange-500/10'
                : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />
            <Upload size={26} className={`mx-auto mb-4 ${isDragging ? 'text-orange-400' : 'text-white/50'}`} />
            <p className="text-white/80 font-medium mb-1">Перетягніть файли або натисніть для вибору</p>
            <p className="text-white/40 text-sm">PDF, зображення, текст — до 50 МБ кожен</p>
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex justify-between mb-3">
                  <h3 className="text-white/70 text-sm">Файли ({files.length})</h3>
                  <button type="button" onClick={() => setFiles([])} className="text-white/40 hover:text-red-400 text-xs">
                    Очистити
                  </button>
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
                  {files.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 ${index < files.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <GripVertical size={14} className="text-white/20" />
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center">
                          {typeIcon[item.type]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.file.name}</p>
                        <p className="text-white/40 text-xs">{formatFileSize(item.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((f) => f.id !== item.id))}
                        className="p-1.5 hover:text-red-400 text-white/40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={uploadFilename}
                    onChange={(e) => setUploadFilename(e.target.value)}
                    placeholder="document"
                    className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                  />
                  <span className="text-white/30 self-center">.pdf</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void handleMergeGenerate()}
              disabled={files.length === 0 || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl"
            >
              {isGenerating && !compressStatus ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {files.length === 0 ? 'Додайте файли' : `Обʼєднати в PDF (${files.length})`}
            </button>
            <button
              type="button"
              onClick={() => void handleCompress()}
              disabled={files.length === 0 || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl border border-white/10"
            >
              {isGenerating && compressStatus ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Minimize2 size={18} />
              )}
              Стиснути PDF
            </button>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/70 text-sm mb-3">Якість стиснення</p>
            <div className="flex gap-2">
              {(
                [
                  ['high', 'Висока'],
                  ['medium', 'Середня'],
                  ['low', 'Сильна'],
                ] as const
              ).map(([q, label]) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setCompressQuality(q)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    compressQuality === q
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-white/35 text-xs mt-2">
              Сильніше стиснення = менший файл, трохи гірша чіткість
            </p>
            {compressStatus && (
              <p className="text-orange-300 text-xs mt-2 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> {compressStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Перетворення + швидкі шаблони */}
      {hubMode === 'convert' && (
        <div className="max-w-3xl mx-auto space-y-8">
          <section>
            <h3 className="text-white font-medium mb-1">Швидкі шаблони</h3>
            <p className="text-white/45 text-sm mb-4">
              Відкриваються в універсальному редакторі — редагуйте, зберігайте, експортуйте PDF
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_TEMPLATES.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => openTemplate(tool.id)}
                  className="text-left p-4 rounded-2xl bg-white/8 border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <tool.icon size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{tool.title}</p>
                      <p className="text-white/45 text-xs mt-1">{tool.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-white font-medium mb-2">Файли → PDF</h3>
            <p className="text-white/45 text-sm mb-3">
              Злиття кількох PDF/фото в один файл — вкладка «Обʼєднання»
            </p>
            <button
              type="button"
              onClick={() => setHubMode('merge')}
              className="text-orange-400 text-sm font-medium hover:underline"
            >
              Перейти до обʼєднання →
            </button>
          </section>
        </div>
      )}

      {/* OCR */}
      {hubMode === 'ocr' && <PdfOcrPanel onOpenInEditor={openInEditor} />}
    </div>
  );
}

import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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

type FileKind = 'image' | 'pdf' | 'other';

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: FileKind;
  error?: string;
}

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
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
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

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filename, setFilename] = useState('document');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        next.push({
          id: Math.random().toString(36).slice(2),
          file,
          previewUrl,
          type,
        });
      }

      if (next.length > 0) {
        setFiles((prev) => [...prev, ...next]);
      }
    },
    [showError],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        void addFiles(event.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files.length > 0) {
        void addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const moveFile = useCallback((id: string, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
      return copy;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
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

      doc.save(`${filename || 'document'}.pdf`);
      showSuccess(t('pdfCreatedSuccess') || 'PDF успішно створено!');
    } catch {
      showError(t('pdfCreateFailed') || 'Не вдалося створити PDF. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
  }, [files, filename, showError, showSuccess, t]);

  const typeIcon = {
    image: <ImageIcon size={18} className="text-blue-400" />,
    pdf: <FileText size={18} className="text-red-400" />,
    other: <FileText size={18} className="text-white/50" />,
  };

  const typeLabel = (type: FileKind) => {
    if (type === 'image') return 'Зображення';
    if (type === 'pdf') return 'PDF документ';
    return 'Текстовий файл';
  };

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {t('createPdfBtn') || 'Створити PDF файл'}
          </h2>
          <p className="text-white/50 text-sm mt-0.5">
            {t('createPdfSubtitle') || 'Завантажте файли та конвертуйте їх у PDF'}
          </p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
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
          onChange={handleInputChange}
          className="hidden"
        />
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
            isDragging ? 'bg-orange-500/20' : 'bg-white/8'
          }`}
        >
          <Upload size={26} className={isDragging ? 'text-orange-400' : 'text-white/50'} />
        </div>
        <p className="text-white/80 font-medium mb-1">
          {isDragging
            ? t('dropFilesHere') || 'Відпустіть файли тут'
            : t('dragDropFiles') || 'Перетягніть файли або натисніть для вибору'}
        </p>
        <p className="text-white/40 text-sm">
          {t('pdfSupportedFormats') ||
            'Підтримуються: зображення (JPG, PNG, GIF, WebP, BMP), PDF, текстові файли'}
        </p>
        <p className="text-white/30 text-xs mt-1">
          {t('pdfMaxFileSize') || 'Максимальний розмір файлу: 50 МБ'}
        </p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white/70 text-sm font-medium">Файли ({files.length})</h3>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-white/40 hover:text-red-400 text-xs transition-colors"
              >
                Очистити все
              </button>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
              {files.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < files.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <GripVertical size={14} className="text-white/20 flex-shrink-0 cursor-grab" />
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                      {typeIcon[item.type]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
                      <span>{formatFileSize(item.file.size)}</span>
                      <span>·</span>
                      <span>{typeLabel(item.type)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveFile(item.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFile(item.id, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all ml-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-6"
        >
          <label className="block text-white/60 text-sm mb-2 font-medium">
            {t('pdfFilenameLabel') || 'Назва PDF файлу'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="document"
              className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-orange-400/50 focus:bg-white/10 transition-all"
            />
            <span className="text-white/30 text-sm flex-shrink-0">.pdf</span>
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-20 left-0 right-0 px-4 lg:bottom-6 lg:static lg:px-0">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={files.length === 0 || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('creatingPdf') || 'Створення PDF...'}
              </>
            ) : (
              <>
                <Download size={18} />
                {files.length === 0
                  ? t('addFiles') || 'Додайте файли'
                  : `${t('downloadPdf') || 'Завантажити PDF'} (${files.length} ${
                      files.length === 1 ? 'файл' : 'файлів'
                    })`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
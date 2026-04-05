import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, ChevronUp, ChevronDown, FileText, Image, Download, Loader2, AlertCircle, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: 'image' | 'pdf' | 'other';
  error?: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getFileType(file: File): 'image' | 'pdf' | 'other' {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic|heif)$/i.test(file.name)) return 'image';
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function renderPdfPageToDataUrl(file: File, pageNumber: number): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
}

export default function PdfCreator() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToastContext();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfName, setPdfName] = useState('document');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const toAdd: UploadedFile[] = [];

    for (const file of arr) {
      if (file.size > MAX_FILE_SIZE) {
        showError(`${file.name}: файл завеликий (макс. 50 МБ)`);
        continue;
      }
      const type = getFileType(file);
      let previewUrl: string | null = null;

      if (type === 'image') {
        try {
          previewUrl = await loadImageAsDataUrl(file);
        } catch {
          previewUrl = null;
        }
      }

      toAdd.push({
        id: Math.random().toString(36).slice(2),
        file,
        previewUrl,
        type,
      });
    }

    setFiles(prev => [...prev, ...toAdd]);
  }, [showError]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const moveFile = useCallback((id: string, direction: 'up' | 'down') => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const generatePdf = useCallback(async () => {
    if (files.length === 0) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const A4_W = 210;
      const A4_H = 297;
      let firstPage = true;

      for (const uploadedFile of files) {
        if (uploadedFile.type === 'image') {
          const dataUrl = uploadedFile.previewUrl || (await loadImageAsDataUrl(uploadedFile.file));
          const dims = await getImageDimensions(dataUrl);
          const ratio = dims.width / dims.height;

          let imgW = A4_W - 20;
          let imgH = imgW / ratio;
          if (imgH > A4_H - 20) {
            imgH = A4_H - 20;
            imgW = imgH * ratio;
          }

          const x = (A4_W - imgW) / 2;
          const y = (A4_H - imgH) / 2;

          const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';

          if (!firstPage) doc.addPage();
          doc.addImage(dataUrl, fmt, x, y, imgW, imgH);
          firstPage = false;
        } else if (uploadedFile.type === 'pdf') {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
          const arrayBuffer = await uploadedFile.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (let p = 1; p <= pdf.numPages; p++) {
            const pageDataUrl = await renderPdfPageToDataUrl(uploadedFile.file, p);
            const dims = await getImageDimensions(pageDataUrl);
            const ratio = dims.width / dims.height;

            let imgW = A4_W - 10;
            let imgH = imgW / ratio;
            if (imgH > A4_H - 10) {
              imgH = A4_H - 10;
              imgW = imgH * ratio;
            }

            const x = (A4_W - imgW) / 2;
            const y = (A4_H - imgH) / 2;

            if (!firstPage) doc.addPage();
            doc.addImage(pageDataUrl, 'JPEG', x, y, imgW, imgH);
            firstPage = false;
          }
        } else {
          const text = await uploadedFile.file.text().catch(() => null);
          if (text !== null) {
            if (!firstPage) doc.addPage();
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 30);
            const lines = doc.splitTextToSize(text, A4_W - 30);
            let y = 20;
            for (const line of lines) {
              if (y > A4_H - 20) {
                doc.addPage();
                y = 20;
              }
              doc.text(line, 15, y);
              y += 6;
            }
            firstPage = false;
          }
        }
      }

      doc.save(`${pdfName || 'document'}.pdf`);
      showSuccess('PDF успішно створено!');
    } catch (err) {
      console.error(err);
      showError('Не вдалося створити PDF. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
  }, [files, pdfName, showSuccess, showError]);

  const fileIcons: Record<string, React.ReactNode> = {
    image: <Image size={18} className="text-blue-400" />,
    pdf: <FileText size={18} className="text-red-400" />,
    other: <FileText size={18} className="text-white/50" />,
  };

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/receipts')}
          className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-white">Створити PDF файл</h2>
          <p className="text-white/50 text-sm mt-0.5">Завантажте файли та конвертуйте їх у PDF</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
          onChange={handleFileInput}
          className="hidden"
        />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${isDragging ? 'bg-orange-500/20' : 'bg-white/8'}`}>
          <Upload size={26} className={isDragging ? 'text-orange-400' : 'text-white/50'} />
        </div>
        <p className="text-white/80 font-medium mb-1">
          {isDragging ? 'Відпустіть файли тут' : 'Перетягніть файли або натисніть для вибору'}
        </p>
        <p className="text-white/40 text-sm">
          Підтримуються: зображення (JPG, PNG, GIF, WebP, BMP), PDF, текстові файли
        </p>
        <p className="text-white/30 text-xs mt-1">Максимальний розмір файлу: 50 МБ</p>
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
              <h3 className="text-white/70 text-sm font-medium">
                Файли ({files.length})
              </h3>
              <button
                onClick={() => setFiles([])}
                className="text-white/40 hover:text-red-400 text-xs transition-colors"
              >
                Очистити все
              </button>
            </div>

            <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
              {files.map((f, index) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 px-4 py-3 ${index < files.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <GripVertical size={14} className="text-white/20 flex-shrink-0 cursor-grab" />

                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                      {fileIcons[f.type]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{f.file.name}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
                      <span>{formatSize(f.file.size)}</span>
                      <span>·</span>
                      <span>
                        {f.type === 'image' ? 'Зображення' : f.type === 'pdf' ? 'PDF документ' : 'Текстовий файл'}
                      </span>
                    </p>
                    {f.error && (
                      <p className="text-red-400 text-xs mt-0.5 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {f.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveFile(f.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFile(f.id, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => removeFile(f.id)}
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
          <label className="block text-white/60 text-sm mb-2 font-medium">Назва PDF файлу</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pdfName}
              onChange={e => setPdfName(e.target.value)}
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
            onClick={generatePdf}
            disabled={files.length === 0 || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Створення PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                {files.length === 0 ? 'Додайте файли' : `Завантажити PDF (${files.length} ${files.length === 1 ? 'файл' : 'файлів'})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

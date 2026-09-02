import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Layout,
  Loader2,
  PenLine,
  Plus,
  Receipt as ReceiptIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { generateCustomPDF, type DocumentType } from '../lib/receiptPdfGenerator';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PageMode = 'create' | 'upload';
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
  'image/heic',
  'image/heif',
];

const CREATE_TOOLS = [
  {
    id: 'blank',
    icon: PenLine,
    title: 'Порожній документ',
    desc: 'Напишіть текст і завантажте PDF',
    docType: 'document' as DocumentType,
    template: 'blank',
  },
  {
    id: 'act',
    icon: FileCheck,
    title: 'Акт робіт',
    desc: 'Шаблон прийому-передачі робіт',
    docType: 'document' as DocumentType,
    template: 'act',
  },
  {
    id: 'letter',
    icon: FileText,
    title: 'Офіційний лист',
    desc: 'Діловий лист або звернення',
    docType: 'document' as DocumentType,
    template: 'letter',
  },
  {
    id: 'presentation',
    icon: Layout,
    title: 'Презентація',
    desc: 'Слайди PDF (альбомна)',
    docType: 'presentation' as DocumentType,
    template: 'presentation',
  },
  {
    id: 'images',
    icon: ImageIcon,
    title: 'Фото в PDF',
    desc: 'Зберігає фото в один PDF',
    docType: 'images' as DocumentType,
    template: 'images',
  },
  {
    id: 'receipt',
    icon: ReceiptIcon,
    title: 'Чек / квитанція',
    desc: 'Простий PDF-чек',
    docType: 'receipt' as DocumentType,
    template: 'receipt',
  },
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

  const [pageMode, setPageMode] = useState<PageMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);

  // Upload mode
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('document');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create mode
  const [docType, setDocType] = useState<DocumentType>('document');
  const [docTitle, setDocTitle] = useState('Офіційний документ');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [docContent, setDocContent] = useState('Текст документа...');
  const [docFooter, setDocFooter] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState('001');
  const [storeName, setStoreName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('Матеріали');
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [slides, setSlides] = useState([
    { title: 'Титульний слайд', text: 'Опис проєкту та основна інформація' },
    { title: 'Перелік робіт', text: '1. Демонтаж\n2. Монтаж\n3. Фінішне оздоблення' },
  ]);
  const createImageInputRef = useRef<HTMLInputElement>(null);

  const applyTemplate = (template: string) => {
    if (template === 'act') {
      setDocType('document');
      setDocTitle('АКТ ПРИЙОМУ-ПЕРЕДАЧІ РОБІТ');
      setDocSubtitle("Об'єкт: Ремонтно-будівельні роботи");
      setDocContent(
        'Ми, що нижче підписалися, підтверджуємо виконання робіт у повному обсязі.\n\n1. Електромонтажні роботи\n2. Сантехнічні роботи\n3. Оздоблювальні роботи\n\nВсі роботи виконані якісно та вчасно.',
      );
      setDocFooter('Виконавець: __________ / Замовник: __________');
    } else if (template === 'letter') {
      setDocType('document');
      setDocTitle('ОФІЦІЙНЕ ЗВЕРНЕННЯ');
      setDocSubtitle('Щодо виконання будівельного проєкту');
      setDocContent(
        'Повідомляємо про успішне завершення запланованого етапу робіт.\n\nПросимо переглянути додані документи та схвалити результати.\n\nЗ повагою,\nКоманда проекту',
      );
      setDocFooter('З повагою, команда проекту');
    } else if (template === 'presentation') {
      setDocType('presentation');
      setSlides([
        { title: 'Будівельний Проєкт', text: 'Комплексний ремонт та оздоблення приміщень' },
        {
          title: 'Етапи реалізації',
          text: '• Проектування та закупівля матеріалів\n• Монтажні роботи\n• Здача під ключ',
        },
        { title: 'Контакти та гарантія', text: 'Гарантія на всі виконані роботи. Контактний телефон: +380...' },
      ]);
    } else if (template === 'images') {
      setDocType('images');
    } else if (template === 'receipt') {
      setDocType('receipt');
      setStoreName('');
      setTotalAmount('');
      setCategory('Матеріали');
    } else {
      setDocType('document');
      setDocTitle('Офіційний документ');
      setDocSubtitle('');
      setDocContent('Текст документа...');
      setDocFooter('');
    }
    setEditorOpen(true);
  };

  const openCreateTool = (tool: (typeof CREATE_TOOLS)[number]) => {
    applyTemplate(tool.template);
    setDocType(tool.docType);
  };

  const handleCreateImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected) return;
    Array.from(selected).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCreateImages((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (createImageInputRef.current) createImageInputRef.current.value = '';
  };

  const handleCreatePDF = async () => {
    setIsGenerating(true);
    try {
      await generateCustomPDF({
        type: docType,
        title: docTitle,
        subtitle: docSubtitle,
        content: docContent,
        footer: docFooter,
        date: docDate,
        number: docNumber,
        storeName,
        totalAmount,
        category,
        images: createImages,
        slides,
      });
      showSuccess('PDF успішно створено!');
    } catch {
      showError('Не вдалося створити PDF. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
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

  const handleUploadGenerate = useCallback(async () => {
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
      showSuccess('PDF успішно створено!');
    } catch {
      showError('Не вдалося створити PDF. Спробуйте ще раз.');
    } finally {
      setIsGenerating(false);
    }
  }, [files, uploadFilename, showError, showSuccess]);

  const typeIcon = {
    image: <ImageIcon size={18} className="text-blue-400" />,
    pdf: <FileText size={18} className="text-red-400" />,
    other: <FileText size={18} className="text-white/50" />,
  };

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => (editorOpen ? setEditorOpen(false) : navigate('/'))}
          className="p-2 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {t('createPdfBtn') || 'Створити PDF файл'}
          </h2>
          <p className="text-white/50 text-sm mt-0.5">
            Створіть документ з нуля або конвертуйте файли в PDF
          </p>
        </div>
      </div>

      {!editorOpen && (
        <div className="flex gap-2 mb-6 p-1 bg-white/8 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setPageMode('create')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              pageMode === 'create'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <PenLine size={16} className="inline mr-2 -mt-0.5" />
            Створити
          </button>
          <button
            type="button"
            onClick={() => setPageMode('upload')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              pageMode === 'upload'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload size={16} className="inline mr-2 -mt-0.5" />
            Конвертувати файли
          </button>
        </div>
      )}

      {pageMode === 'create' && !editorOpen && (
        <div className="space-y-4">
          <p className="text-white/50 text-sm">Оберіть тип документа — як у PDF-редакторах:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CREATE_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => openCreateTool(tool)}
                className="text-left p-4 rounded-2xl bg-white/8 border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/25">
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
        </div>
      )}

      {pageMode === 'create' && editorOpen && (
        <div className="space-y-4">
          <Card className="p-4 bg-slate-900 border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Тип документа
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(
                [
                  ['document', FileText, 'Документ'],
                  ['images', ImageIcon, 'Фото'],
                  ['presentation', Layout, 'Слайди'],
                  ['receipt', ReceiptIcon, 'Чек'],
                ] as const
              ).map(([type, Icon, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocType(type)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    docType === type
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 space-y-4 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Дата</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Номер</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            {docType === 'document' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Заголовок"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                />
                <input
                  type="text"
                  value={docSubtitle}
                  onChange={(e) => setDocSubtitle(e.target.value)}
                  placeholder="Підзаголовок / Об'єкт"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <textarea
                  rows={8}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Текст документа"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                />
                <input
                  type="text"
                  value={docFooter}
                  onChange={(e) => setDocFooter(e.target.value)}
                  placeholder="Підпис / підвал"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            )}

            {docType === 'images' && (
              <div className="space-y-4">
                <input
                  ref={createImageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleCreateImageUpload}
                />
                <button
                  type="button"
                  onClick={() => createImageInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-amber-500/50 hover:text-amber-400 transition-all"
                >
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  Додати фотографії
                </button>
                {createImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {createImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCreateImages(createImages.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-red-600 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {docType === 'presentation' && (
              <div className="space-y-3">
                {slides.map((slide, idx) => (
                  <div key={idx} className="p-3 border border-slate-800 rounded-xl space-y-2">
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => {
                        const next = [...slides];
                        next[idx].title = e.target.value;
                        setSlides(next);
                      }}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                      placeholder="Заголовок слайду"
                    />
                    <textarea
                      rows={2}
                      value={slide.text}
                      onChange={(e) => {
                        const next = [...slides];
                        next[idx].text = e.target.value;
                        setSlides(next);
                      }}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                      placeholder="Текст слайду"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSlides([...slides, { title: `Слайд ${slides.length + 1}`, text: '' }])}
                >
                  <Plus className="w-4 h-4 mr-1" /> Додати слайд
                </Button>
              </div>
            )}

            {docType === 'receipt' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Магазин / постачальник"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="Сума"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Матеріали">Матеріали</option>
                    <option value="Інструменти">Інструменти</option>
                    <option value="Транспорт">Транспорт</option>
                    <option value="Послуги">Послуги</option>
                  </select>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={() => void handleCreatePDF()}
              disabled={isGenerating}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin inline" /> Генерується...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2 inline" /> Завантажити PDF
                </>
              )}
            </Button>
          </Card>
        </div>
      )}

      {pageMode === 'upload' && !editorOpen && (
        <>
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
            <p className="text-white/80 font-medium mb-1">
              {t('dragDropFiles') || 'Перетягніть файли або натисніть для вибору'}
            </p>
            <p className="text-white/40 text-sm">
              Зображення, PDF, текстові файли — до 50 МБ
            </p>
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

          <button
            type="button"
            onClick={() => void handleUploadGenerate()}
            disabled={files.length === 0 || isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {files.length === 0 ? 'Додайте файли' : `Завантажити PDF (${files.length})`}
          </button>
        </>
      )}
    </div>
  );
}

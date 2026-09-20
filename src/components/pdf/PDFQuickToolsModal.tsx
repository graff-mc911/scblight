import React, { useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  FilePlus2,
  Loader2,
  Minimize2,
  PenLine,
  Scissors,
  Upload,
  X,
} from 'lucide-react';
import { type QuickToolId, usePdfStore } from '../../store/usePdfStore';

const PRIMARY: { id: QuickToolId; Icon: typeof PenLine; title: string; desc: string }[] = [
  { id: 'merge', Icon: FilePlus2, title: "Об'єднати PDF", desc: "Об'єднання відкритих документів." },
  { id: 'compress', Icon: Minimize2, title: 'Стиснути PDF', desc: 'Зменшення розміру активного PDF.' },
  { id: 'edit', Icon: PenLine, title: 'Редагувати PDF', desc: 'Редактор з полями та текстом.' },
  { id: 'convert', Icon: ArrowLeftRight, title: 'Конвертувати PDF', desc: 'Імпорт / експорт файлів.' },
  { id: 'split', Icon: Scissors, title: 'Розділити PDF', desc: 'Кожна сторінка — окремий документ.' },
];

const LINKS: { id: QuickToolId; label: string }[][] = [
  [
    { id: 'sign', label: 'Ел. підпис' },
    { id: 'new-file', label: 'Створити файл' },
    { id: 'pdf-to-jpg', label: 'PDF у JPG' },
  ],
  [
    { id: 'rotate', label: 'Повернути PDF' },
    { id: 'protect', label: 'Захистити PDF' },
    { id: 'unlock', label: 'Зняти захист' },
  ],
  [
    { id: 'ocr', label: 'OCR' },
    { id: 'watermark', label: 'Водяний знак' },
    { id: 'delete-pages', label: 'Видалити сторінки' },
  ],
];

export const PDFQuickToolsModal: React.FC = () => {
  const open = usePdfStore((s) => s.quickToolsOpen);
  const setQuickToolsOpen = usePdfStore((s) => s.setQuickToolsOpen);
  const setRibbonTab = usePdfStore((s) => s.setRibbonTab);
  const setCreateFileOpen = usePdfStore((s) => s.setCreateFileOpen);
  const setSignatureModalOpen = usePdfStore((s) => s.setSignatureModalOpen);
  const setProtectModalOpen = usePdfStore((s) => s.setProtectModalOpen);
  const mergeOpenDocuments = usePdfStore((s) => s.mergeOpenDocuments);
  const splitActiveDocument = usePdfStore((s) => s.splitActiveDocument);
  const compressActiveDocument = usePdfStore((s) => s.compressActiveDocument);
  const unlockActiveDocument = usePdfStore((s) => s.unlockActiveDocument);
  const rotateActivePage = usePdfStore((s) => s.rotateActivePage);
  const deleteActivePage = usePdfStore((s) => s.deleteActivePage);
  const downloadActivePdf = usePdfStore((s) => s.downloadActivePdf);
  const importFiles = usePdfStore((s) => s.importFiles);
  const setPlacingType = usePdfStore((s) => s.setPlacingType);
  const pushToast = usePdfStore((s) => s.pushToast);
  const handleSubAction = usePdfStore((s) => s.handleSubAction);

  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const run = async (id: QuickToolId) => {
    setBusy(true);
    try {
      switch (id) {
        case 'merge':
          await mergeOpenDocuments();
          break;
        case 'split':
          await splitActiveDocument();
          break;
        case 'compress':
        case 'resize':
          await compressActiveDocument();
          break;
        case 'edit':
        case 'read':
          setRibbonTab('edit');
          setQuickToolsOpen(false);
          pushToast('info', 'Режим редагування');
          break;
        case 'convert':
          inputRef.current?.click();
          break;
        case 'sign':
          setRibbonTab('esign');
          setSignatureModalOpen(true);
          setQuickToolsOpen(false);
          break;
        case 'new-file':
          setCreateFileOpen(true);
          setQuickToolsOpen(false);
          break;
        case 'protect':
          setProtectModalOpen(true);
          break;
        case 'unlock':
          unlockActiveDocument();
          break;
        case 'rotate':
          rotateActivePage(90);
          break;
        case 'delete-pages':
          deleteActivePage();
          break;
        case 'watermark':
          setPlacingType('stamp');
          setRibbonTab('secure');
          setQuickToolsOpen(false);
          pushToast('info', 'Клікніть на сторінку для штампа');
          break;
        case 'ocr':
          handleSubAction('recognize');
          break;
        case 'pdf-to-jpg':
          await downloadActivePdf();
          pushToast('info', 'Експортуйте сторінки через Download; JPG — через Compress+Export');
          break;
        default:
          pushToast('info', `Інструмент: ${id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[1000px] bg-[#e8eaed] rounded-2xl shadow-2xl border border-[#d1d5db] my-4">
        <div className="flex items-center justify-between px-5 py-3 bg-white rounded-t-2xl border-b border-[#e5e7eb]">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">Швидкі інструменти</h2>
          <button type="button" onClick={() => setQuickToolsOpen(false)} className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#64748b]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {PRIMARY.map(({ id, Icon, title, desc }) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => void run(id)}
                className="text-left bg-white rounded-xl p-4 min-h-[150px] shadow-sm border border-transparent hover:border-[#3b82f6] hover:shadow-md transition-all"
              >
                <Icon className="text-[#3b82f6] mb-3" size={32} strokeWidth={1.5} />
                <p className="font-bold text-[14px] text-[#1a1f36] mb-1.5">{title}</p>
                <p className="text-[12px] text-[#5c6378] leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-4">
            {LINKS.flat().map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                onClick={() => void run(item.id)}
                className="text-left text-[13px] text-[#1a1f36] hover:text-[#2563eb] py-1"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d1d5db] bg-white text-sm"
            >
              <Upload size={14} /> Завантажити файли
            </button>
            <button
              type="button"
              onClick={() => void downloadActivePdf()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
};

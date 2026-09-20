import React from 'react';
import {
  AtSign,
  Calendar,
  ChevronRight,
  PenLine,
  Type,
  User,
  X,
} from 'lucide-react';
import { type OverlayFieldType, usePdfWorkspace } from '../../lib/pdf/workspaceStore';

const SIGN_FIELDS: { type: OverlayFieldType; label: string; icon: typeof PenLine; tone: string }[] = [
  { type: 'signature', label: 'Signature', icon: PenLine, tone: 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]' },
  { type: 'initials', label: 'Initials', icon: Type, tone: 'bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4]' },
  { type: 'date', label: 'Date', icon: Calendar, tone: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]' },
  { type: 'name', label: 'Name', icon: User, tone: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]' },
  { type: 'email', label: 'Email', icon: AtSign, tone: 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]' },
];

export const PDFRightSidebar: React.FC = () => {
  const sidebarOpen = usePdfWorkspace((s) => s.sidebarOpen);
  const ribbonTab = usePdfWorkspace((s) => s.ribbonTab);
  const placingType = usePdfWorkspace((s) => s.placingType);
  const setPlacingType = usePdfWorkspace((s) => s.setPlacingType);
  const toggleSidebar = usePdfWorkspace((s) => s.toggleSidebar);
  const setSidebarOpen = usePdfWorkspace((s) => s.setSidebarOpen);
  const selectedFieldId = usePdfWorkspace((s) => s.selectedFieldId);
  const removeField = usePdfWorkspace((s) => s.removeField);
  const documents = usePdfWorkspace((s) => s.documents);
  const activeDocId = usePdfWorkspace((s) => s.activeDocId);
  const doc = documents.find((d) => d.id === activeDocId);

  if (!sidebarOpen) {
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-[#e5e7eb] border-r-0 rounded-l-lg px-1.5 py-3 shadow text-[#64748b] hover:text-[#3b82f6]"
        title="Open panel"
      >
        <ChevronRight size={16} className="rotate-180" />
      </button>
    );
  }

  const isSign = ribbonTab === 'esign' || ribbonTab === 'fill';
  const title =
    ribbonTab === 'ocr'
      ? 'OCR'
      : ribbonTab === 'edit'
        ? 'Edit'
        : ribbonTab === 'secure'
          ? 'Secure'
          : 'Sign your document';

  return (
    <aside className="w-[260px] shrink-0 bg-white border-l border-[#e5e7eb] flex flex-col z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef2f7]">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">{title}</h3>
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-[#f1f5f9] text-[#94a3b8]"
          aria-label="Collapse"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isSign && (
          <>
            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide px-1 mb-2">
              Drag fields onto the document
            </p>
            {SIGN_FIELDS.map(({ type, label, icon: Icon, tone }) => (
              <button
                key={type}
                type="button"
                onClick={() => setPlacingType(placingType === type ? null : type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-[13px] font-medium transition-all ${tone} ${
                  placingType === type ? 'ring-2 ring-[#3b82f6] ring-offset-1' : 'hover:brightness-[0.98]'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            {placingType && (
              <p className="text-[12px] text-[#2563eb] px-1 pt-2">
                Клікніть на сторінку, щоб розмістити «{placingType}»
              </p>
            )}
            {selectedFieldId && (
              <button
                type="button"
                onClick={() => removeField(selectedFieldId)}
                className="w-full mt-3 text-[12px] text-red-600 hover:bg-red-50 rounded-lg py-2 border border-red-100"
              >
                Видалити вибране поле
              </button>
            )}
            {doc && doc.fields.length > 0 && (
              <p className="text-[11px] text-[#94a3b8] px-1 pt-2">Полів: {doc.fields.length}</p>
            )}
          </>
        )}

        {ribbonTab === 'ocr' && (
          <div className="text-sm text-[#475569] space-y-2 px-1">
            <p>OCR доступний у Швидких інструментах (Recognize text).</p>
            <button
              type="button"
              onClick={() => usePdfWorkspace.getState().setQuickToolsOpen(true)}
              className="w-full py-2 rounded-lg bg-[#eff6ff] text-[#1d4ed8] text-[13px] font-medium"
            >
              Відкрити OCR
            </button>
          </div>
        )}

        {ribbonTab === 'edit' && (
          <div className="text-sm text-[#475569] px-1 space-y-2">
            <p>Редагуйте розміщені поля або відкрийте Швидкі інструменти для обʼєднання / стиснення.</p>
          </div>
        )}

        {ribbonTab === 'secure' && (
          <div className="text-sm text-[#475569] px-1">
            Protect / Watermark — через Швидкі інструменти.
          </div>
        )}

        {!isSign && ribbonTab !== 'ocr' && ribbonTab !== 'edit' && ribbonTab !== 'secure' && (
          <p className="text-sm text-[#64748b] px-1">
            Оберіть вкладку E-Sign або Fill & Sign, щоб додати поля підпису.
          </p>
        )}
      </div>
    </aside>
  );
};

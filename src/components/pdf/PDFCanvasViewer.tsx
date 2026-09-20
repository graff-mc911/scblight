import React, { useRef } from 'react';
import { Check, FilePlus, Upload } from 'lucide-react';
import {
  type OverlayField,
  type OverlayFieldType,
  usePdfStore,
} from '../../store/usePdfStore';

export const PDFCanvasViewer: React.FC = () => {
  const documents = usePdfStore((s) => s.documents);
  const activeDocId = usePdfStore((s) => s.activeDocId);
  const zoom = usePdfStore((s) => s.zoom);
  const workflowStep = usePdfStore((s) => s.workflowStep);
  const placingType = usePdfStore((s) => s.placingType);
  const selectedFieldId = usePdfStore((s) => s.selectedFieldId);
  const statusMsg = usePdfStore((s) => s.statusMsg);
  const viewMode = usePdfStore((s) => s.viewMode);
  const setWorkflowStep = usePdfStore((s) => s.setWorkflowStep);
  const placeFieldAt = usePdfStore((s) => s.placeFieldAt);
  const setSelectedField = usePdfStore((s) => s.setSelectedField);
  const updateField = usePdfStore((s) => s.updateField);
  const removeField = usePdfStore((s) => s.removeField);
  const setCreateFileOpen = usePdfStore((s) => s.setCreateFileOpen);
  const setQuickToolsOpen = usePdfStore((s) => s.setQuickToolsOpen);
  const triggerUploadDialog = usePdfStore((s) => s.triggerUploadDialog);
  const downloadActivePdf = usePdfStore((s) => s.downloadActivePdf);
  const setActivePage = usePdfStore((s) => s.setActivePage);

  const doc = documents.find((d) => d.id === activeDocId) || null;
  const pages = doc?.pages?.length
    ? doc.pages
    : (doc?.pageUrls || []).map((dataUrl, i) => ({
        id: String(i),
        dataUrl,
        width: 595,
        height: 842,
        rotation: 0,
      }));

  const visiblePages =
    viewMode === 'single' && doc
      ? pages.slice(doc.activePageIndex, doc.activePageIndex + 1).map((p, i) => ({
          page: p,
          index: doc.activePageIndex + i,
        }))
      : pages.map((p, index) => ({ page: p, index }));

  const onPageClick = (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingType || !doc) {
      setActivePage(pageIndex);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    placeFieldAt(pageIndex, x, y);
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-[#c5cad3] relative flex flex-col">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-2 bg-white rounded-full shadow-md border border-[#e5e7eb] px-1.5 sm:px-2 py-1.5 max-w-[96%] overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setWorkflowStep(1);
            setCreateFileOpen(true);
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] whitespace-nowrap ${
            workflowStep === 1 ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#64748b]'
          }`}
        >
          {workflowStep > 1 ? <Check size={12} className="text-emerald-500" /> : <span className="w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[10px] flex items-center justify-center">1</span>}
          Add documents
        </button>
        <span className="text-[#cbd5e1]">→</span>
        <button
          type="button"
          onClick={() => setWorkflowStep(2)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] whitespace-nowrap ${
            workflowStep === 2 ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#64748b]'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[10px] flex items-center justify-center">2</span>
          Add fields and send
        </button>
        <button type="button" className="ml-1 px-2.5 py-1 text-[11px] text-[#64748b] hover:bg-[#f1f5f9] rounded-full" onClick={() => setQuickToolsOpen(true)}>
          Cancel
        </button>
        <button
          type="button"
          className="px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-full"
          onClick={() => void downloadActivePdf()}
        >
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-4 pt-14 pb-8">
        {!doc || pages.length === 0 ? (
          <div className="max-w-lg mx-auto mt-10 sm:mt-16 text-center bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-8 sm:p-10">
            <FilePlus className="mx-auto text-[#3b82f6] mb-4" size={36} />
            <h3 className="text-lg font-semibold text-[#0f172a] mb-2">Створіть або відкрийте файл</h3>
            <p className="text-sm text-[#64748b] mb-6">Чистий аркуш, шаблон або PDF/зображення — у одному workspace.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => setCreateFileOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb]"
              >
                <FilePlus size={16} /> Створити файл
              </button>
              <button
                type="button"
                onClick={triggerUploadDialog}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#d1d5db] text-[#334155] text-sm font-medium hover:bg-[#f8fafc]"
              >
                <Upload size={16} /> Завантажити
              </button>
            </div>
          </div>
        ) : (
          <div
            className="mx-auto space-y-6 transition-transform origin-top"
            style={{
              width: `${Math.round(((doc.pages[0]?.width || 595) * zoom) / 100)}px`,
              maxWidth: '100%',
            }}
          >
            {visiblePages.map(({ page, index }) => (
              <div
                key={page.id || index}
                id={`pdf-page-${doc.id}-${index}`}
                className={`relative bg-white shadow-lg mx-auto ${placingType ? 'cursor-crosshair' : ''} ${
                  doc.activePageIndex === index ? 'ring-2 ring-[#3b82f6]/40' : ''
                }`}
                style={{ transform: `rotate(${page.rotation || 0}deg)` }}
                onClick={(e) => onPageClick(index, e)}
                role="presentation"
              >
                <img src={page.dataUrl} alt={`Page ${index + 1}`} className="w-full h-auto block select-none" draggable={false} />
                {doc.fields
                  .filter((f) => f.page === index)
                  .map((field) => (
                    <FieldBox
                      key={field.id}
                      field={field}
                      selected={selectedFieldId === field.id}
                      onSelect={() => setSelectedField(field.id)}
                      onMove={(patch) => updateField(field.id, patch)}
                      onDelete={() => removeField(field.id)}
                      onToggleCheck={() =>
                        field.type === 'checkbox' && updateField(field.id, { checked: !field.checked })
                      }
                    />
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0f172a]/90 text-white text-xs px-4 py-2 rounded-full shadow z-30">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

const FieldBox: React.FC<{
  field: OverlayField;
  selected: boolean;
  onSelect: () => void;
  onMove: (patch: Partial<OverlayField>) => void;
  onDelete: () => void;
  onToggleCheck: () => void;
}> = ({ field, selected, onSelect, onMove, onDelete, onToggleCheck }) => {
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  const colors: Record<OverlayFieldType, string> = {
    signature: 'border-emerald-400 bg-emerald-50/80',
    initials: 'border-teal-400 bg-teal-50/80',
    date: 'border-sky-400 bg-sky-50/80',
    name: 'border-blue-400 bg-blue-50/80',
    email: 'border-indigo-400 bg-indigo-50/80',
    text: 'border-slate-400 bg-white/90',
    image: 'border-violet-400 bg-violet-50/50',
    checkbox: 'border-slate-500 bg-white',
    stamp: 'border-rose-400 bg-rose-50/80',
    note: 'border-amber-400 bg-amber-50/90',
    highlight: 'border-yellow-300 bg-yellow-200/50',
  };

  return (
    <div
      className={`absolute border-2 rounded-sm flex items-center justify-center text-[11px] font-medium text-[#334155] overflow-hidden ${
        colors[field.type]
      } ${selected ? 'ring-2 ring-[#3b82f6] ring-offset-1 z-10' : ''}`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.w}%`,
        height: `${field.h}%`,
        cursor: 'move',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
        if (field.type === 'checkbox') onToggleCheck();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        dragRef.current = {
          ox: ((e.clientX - parent.left) / parent.width) * 100 - field.x,
          oy: ((e.clientY - parent.top) / parent.height) * 100 - field.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
        const x = ((e.clientX - parent.left) / parent.width) * 100 - dragRef.current.ox;
        const y = ((e.clientY - parent.top) / parent.height) * 100 - dragRef.current.oy;
        onMove({
          x: Math.max(0, Math.min(100 - field.w, x)),
          y: Math.max(0, Math.min(100 - field.h, y)),
        });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (field.type === 'text' || field.type === 'name' || field.type === 'note') {
          const next = window.prompt('Текст', field.value || '');
          if (next !== null) onMove({ value: next });
        }
      }}
    >
      {field.value?.startsWith('data:') ? (
        <img src={field.value} alt="" className="w-full h-full object-contain pointer-events-none" />
      ) : field.type === 'checkbox' ? (
        <span className="text-sm">{field.checked ? '✓' : ''}</span>
      ) : (
        field.value || field.type
      )}
      {selected && (
        <>
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          <button
            type="button"
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] leading-none"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
};

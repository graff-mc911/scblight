import React, { useRef } from 'react';
import { Check, Upload } from 'lucide-react';
import {
  type OverlayField,
  type OverlayFieldType,
  uid,
  usePdfWorkspace,
} from '../../lib/pdf/workspaceStore';
import { openPdfFiles } from './openPdfFiles';

const DEFAULT_SIZE: Record<OverlayFieldType, { w: number; h: number }> = {
  signature: { w: 28, h: 8 },
  initials: { w: 12, h: 6 },
  date: { w: 16, h: 5 },
  name: { w: 22, h: 5 },
  email: { w: 24, h: 5 },
};

export const PDFCanvasViewer: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const documents = usePdfWorkspace((s) => s.documents);
  const activeDocId = usePdfWorkspace((s) => s.activeDocId);
  const zoom = usePdfWorkspace((s) => s.zoom);
  const workflowStep = usePdfWorkspace((s) => s.workflowStep);
  const placingType = usePdfWorkspace((s) => s.placingType);
  const selectedFieldId = usePdfWorkspace((s) => s.selectedFieldId);
  const statusMsg = usePdfWorkspace((s) => s.statusMsg);
  const setWorkflowStep = usePdfWorkspace((s) => s.setWorkflowStep);
  const addField = usePdfWorkspace((s) => s.addField);
  const setSelectedField = usePdfWorkspace((s) => s.setSelectedField);
  const updateField = usePdfWorkspace((s) => s.updateField);
  const setQuickToolsOpen = usePdfWorkspace((s) => s.setQuickToolsOpen);

  const doc = documents.find((d) => d.id === activeDocId) || null;

  const placeOnPage = (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingType || !doc) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const size = DEFAULT_SIZE[placingType];
    const field: OverlayField = {
      id: uid(),
      type: placingType,
      page: pageIndex,
      x: Math.max(0, Math.min(100 - size.w, x - size.w / 2)),
      y: Math.max(0, Math.min(100 - size.h, y - size.h / 2)),
      w: size.w,
      h: size.h,
      value:
        placingType === 'date'
          ? new Date().toLocaleDateString()
          : placingType === 'signature'
            ? 'Підпис'
            : placingType === 'initials'
              ? 'XX'
              : placingType,
    };
    addField(field);
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-[#c5cad3] relative flex flex-col">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-2 bg-white rounded-full shadow-md border border-[#e5e7eb] px-1.5 sm:px-2 py-1.5 max-w-[96%] overflow-x-auto">
        <button
          type="button"
          onClick={() => setWorkflowStep(1)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] whitespace-nowrap ${
            workflowStep === 1 ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#64748b]'
          }`}
        >
          {workflowStep > 1 ? (
            <Check size={12} className="text-emerald-500" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[10px] flex items-center justify-center">
              1
            </span>
          )}
          Add documents
        </button>
        <span className="text-[#cbd5e1] shrink-0">→</span>
        <button
          type="button"
          onClick={() => setWorkflowStep(2)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] whitespace-nowrap ${
            workflowStep === 2 ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#64748b]'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[10px] flex items-center justify-center">
            2
          </span>
          Add fields and send
        </button>
        <button
          type="button"
          className="ml-1 px-2.5 py-1 text-[11px] sm:text-[12px] text-[#64748b] hover:bg-[#f1f5f9] rounded-full whitespace-nowrap"
          onClick={() => setQuickToolsOpen(true)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-full whitespace-nowrap"
        >
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-4 pt-14 pb-8">
        {!doc || doc.pageUrls.length === 0 ? (
          <div className="max-w-lg mx-auto mt-10 sm:mt-16 text-center bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-8 sm:p-10">
            <Upload className="mx-auto text-[#3b82f6] mb-4" size={36} />
            <h3 className="text-lg font-semibold text-[#0f172a] mb-2">Відкрийте PDF</h3>
            <p className="text-sm text-[#64748b] mb-6">
              Один workspace: перегляд, підпис, редагування та швидкі інструменти.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb]"
            >
              <Upload size={16} /> Вибрати PDF
            </button>
            <button
              type="button"
              onClick={() => setQuickToolsOpen(true)}
              className="block mx-auto mt-3 text-sm text-[#2563eb] hover:underline"
            >
              Швидкі інструменти
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                void openPdfFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div
            className="mx-auto space-y-6"
            style={{ width: `${Math.round((595 * zoom) / 100)}px`, maxWidth: '100%' }}
          >
            {doc.pageUrls.map((url, pageIndex) => (
              <div
                key={`${doc.id}-${pageIndex}`}
                className={`relative bg-white shadow-lg mx-auto ${placingType ? 'cursor-crosshair' : ''}`}
                onClick={(e) => placeOnPage(pageIndex, e)}
                role="presentation"
              >
                <img
                  src={url}
                  alt={`Page ${pageIndex + 1}`}
                  className="w-full h-auto block select-none"
                  draggable={false}
                />
                {doc.fields
                  .filter((f) => f.page === pageIndex)
                  .map((field) => (
                    <FieldBox
                      key={field.id}
                      field={field}
                      selected={selectedFieldId === field.id}
                      onSelect={() => setSelectedField(field.id)}
                      onMove={(patch) => updateField(field.id, patch)}
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
}> = ({ field, selected, onSelect, onMove }) => {
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  const colors: Record<OverlayFieldType, string> = {
    signature: 'border-emerald-400 bg-emerald-50/80',
    initials: 'border-teal-400 bg-teal-50/80',
    date: 'border-sky-400 bg-sky-50/80',
    name: 'border-blue-400 bg-blue-50/80',
    email: 'border-indigo-400 bg-indigo-50/80',
  };

  return (
    <div
      className={`absolute border-2 rounded-sm flex items-center justify-center text-[11px] font-medium text-[#334155] ${
        colors[field.type]
      } ${selected ? 'ring-2 ring-[#3b82f6] ring-offset-1' : ''}`}
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
    >
      {field.value || field.type}
      {selected && (
        <>
          <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
        </>
      )}
    </div>
  );
};

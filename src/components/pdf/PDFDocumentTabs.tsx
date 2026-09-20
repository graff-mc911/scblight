import React, { useRef } from 'react';
import { Plus, X, Lock } from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';

export const PDFDocumentTabs: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = usePdfStore((s) => s.documents);
  const activeDocId = usePdfStore((s) => s.activeDocId);
  const setActiveDoc = usePdfStore((s) => s.setActiveDoc);
  const closeDoc = usePdfStore((s) => s.closeDoc);
  const setCreateFileOpen = usePdfStore((s) => s.setCreateFileOpen);
  const importFiles = usePdfStore((s) => s.importFiles);

  return (
    <div className="flex items-end gap-0 px-2 pt-1 bg-[#e8eaed] border-b border-[#d1d5db] shrink-0 min-h-[36px]">
      {documents.map((doc) => {
        const active = doc.id === activeDocId;
        return (
          <div
            key={doc.id}
            className={`group flex items-center gap-1 max-w-[220px] px-3 py-1.5 text-[12px] rounded-t-md border border-b-0 cursor-pointer ${
              active
                ? 'bg-white border-[#d1d5db] text-[#0f172a] font-medium -mb-px z-10'
                : 'bg-[#dfe3e8] border-transparent text-[#475569] hover:bg-[#eef1f4]'
            }`}
            onClick={() => setActiveDoc(doc.id)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveDoc(doc.id)}
            role="tab"
            tabIndex={0}
          >
            {doc.protected && <Lock size={10} className="text-amber-500 shrink-0" />}
            <span className="truncate">{doc.name}</span>
            <button
              type="button"
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#e2e8f0] text-[#64748b]"
              onClick={(e) => {
                e.stopPropagation();
                closeDoc(doc.id);
              }}
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setCreateFileOpen(true)}
        className="ml-1 mb-0.5 p-1.5 rounded hover:bg-[#d1d5db] text-[#64748b]"
        title="Створити / відкрити"
      >
        <Plus size={14} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void importFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

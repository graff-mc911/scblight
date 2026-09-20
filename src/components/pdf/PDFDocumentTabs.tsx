import React, { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { usePdfWorkspace } from '../../lib/pdf/workspaceStore';
import { openPdfFiles } from './openPdfFiles';

export const PDFDocumentTabs: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = usePdfWorkspace((s) => s.documents);
  const activeDocId = usePdfWorkspace((s) => s.activeDocId);
  const setActiveDoc = usePdfWorkspace((s) => s.setActiveDoc);
  const closeDoc = usePdfWorkspace((s) => s.closeDoc);

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
        onClick={() => inputRef.current?.click()}
        className="ml-1 mb-0.5 p-1.5 rounded hover:bg-[#d1d5db] text-[#64748b]"
        title="Відкрити PDF"
      >
        <Plus size={14} />
      </button>
      <input
        ref={inputRef}
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
  );
};

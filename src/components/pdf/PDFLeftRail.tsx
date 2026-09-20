import React from 'react';
import { Bookmark, Layers } from 'lucide-react';
import { usePdfWorkspace } from '../../lib/pdf/workspaceStore';

/** Left icon rail — pages / bookmarks (Soda style) */
export const PDFLeftRail: React.FC = () => {
  const leftRail = usePdfWorkspace((s) => s.leftRail);
  const setLeftRail = usePdfWorkspace((s) => s.setLeftRail);
  const documents = usePdfWorkspace((s) => s.documents);
  const activeDocId = usePdfWorkspace((s) => s.activeDocId);
  const doc = documents.find((d) => d.id === activeDocId);

  return (
    <div className="flex shrink-0 z-10">
      <div className="w-10 bg-[#f1f5f9] border-r border-[#e5e7eb] flex flex-col items-center py-2 gap-1">
        <button
          type="button"
          onClick={() => setLeftRail(leftRail === 'pages' ? null : 'pages')}
          className={`p-2 rounded-lg ${
            leftRail === 'pages' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#64748b] hover:bg-white/70'
          }`}
          title="Pages"
        >
          <Layers size={16} />
        </button>
        <button
          type="button"
          onClick={() => setLeftRail(leftRail === 'bookmarks' ? null : 'bookmarks')}
          className={`p-2 rounded-lg ${
            leftRail === 'bookmarks' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#64748b] hover:bg-white/70'
          }`}
          title="Bookmarks"
        >
          <Bookmark size={16} />
        </button>
      </div>

      {leftRail === 'pages' && doc && doc.pageUrls.length > 0 && (
        <div className="w-[120px] bg-white border-r border-[#e5e7eb] overflow-y-auto p-2 space-y-2 hidden sm:block">
          {doc.pageUrls.map((url, i) => (
            <a
              key={i}
              href={`#page-${i}`}
              className="block rounded border border-[#e5e7eb] overflow-hidden hover:border-[#3b82f6]"
            >
              <img src={url} alt="" className="w-full h-auto" />
              <p className="text-[10px] text-center text-[#64748b] py-0.5">{i + 1}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

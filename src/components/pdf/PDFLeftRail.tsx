import React from 'react';
import { Bookmark, Layers } from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';

export const PDFLeftRail: React.FC = () => {
  const leftRail = usePdfStore((s) => s.leftRail);
  const setLeftRail = usePdfStore((s) => s.setLeftRail);
  const documents = usePdfStore((s) => s.documents);
  const activeDocId = usePdfStore((s) => s.activeDocId);
  const setActivePage = usePdfStore((s) => s.setActivePage);
  const pushToast = usePdfStore((s) => s.pushToast);
  const doc = documents.find((d) => d.id === activeDocId);
  const pages = doc?.pages?.length ? doc.pages : (doc?.pageUrls || []).map((dataUrl) => ({ dataUrl, rotation: 0 }));

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
          onClick={() => {
            setLeftRail(leftRail === 'bookmarks' ? null : 'bookmarks');
            pushToast('info', 'Закладки: позначте сторінки через мініатюри');
          }}
          className={`p-2 rounded-lg ${
            leftRail === 'bookmarks' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#64748b] hover:bg-white/70'
          }`}
          title="Bookmarks"
        >
          <Bookmark size={16} />
        </button>
      </div>

      {leftRail === 'pages' && pages.length > 0 && (
        <div className="w-[120px] bg-white border-r border-[#e5e7eb] overflow-y-auto p-2 space-y-2 hidden sm:block">
          {pages.map((page, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivePage(i)}
              className={`block w-full rounded border overflow-hidden ${
                doc?.activePageIndex === i ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]' : 'border-[#e5e7eb] hover:border-[#93c5fd]'
              }`}
            >
              <img
                src={page.dataUrl}
                alt=""
                className="w-full h-auto"
                style={{ transform: `rotate(${page.rotation || 0}deg)` }}
              />
              <p className="text-[10px] text-center text-[#64748b] py-0.5">{i + 1}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

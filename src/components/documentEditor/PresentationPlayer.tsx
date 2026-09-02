import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Slide } from '../../lib/documentEditor/types';

interface Props {
  slides: Slide[];
  onClose: () => void;
}

export const PresentationPlayer: React.FC<Props> = ({ slides, onClose }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length, onClose]);

  if (!slide) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
    >
      <div className="flex items-center justify-between p-4 text-white/60">
        <span>
          {index + 1} / {slides.length}
        </span>
        <button type="button" onClick={onClose} className="p-2 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center px-8 md:px-20 text-white"
        style={{ background: slide.backgroundColor || '#1e293b' }}
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-8 text-center">{slide.title}</h2>
        {slide.blocks.map((block) => {
          if (block.type === 'text')
            return (
              <div
                key={block.id}
                className="prose prose-invert prose-lg max-w-3xl text-center"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          if (block.type === 'image')
            return <img key={block.id} src={block.src} alt="" className="max-h-[50vh] rounded-xl" />;
          return null;
        })}
      </div>

      <div className="flex justify-center gap-4 p-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => Math.max(i - 1, 0));
          }}
          disabled={index === 0}
          className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => Math.min(i + 1, slides.length - 1));
          }}
          disabled={index === slides.length - 1}
          className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import { Check, Eraser, X } from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';

export const PDFSignatureModal: React.FC = () => {
  const open = usePdfStore((s) => s.signatureModalOpen);
  const setSignatureModalOpen = usePdfStore((s) => s.setSignatureModalOpen);
  const saveSignatureAsset = usePdfStore((s) => s.saveSignatureAsset);
  const savedSignature = usePdfStore((s) => s.savedSignature);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (savedSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = savedSignature;
    }
  }, [open, savedSignature]);

  if (!open) return null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    setTyped('');
  };

  const save = () => {
    if (mode === 'type' && typed.trim()) {
      const c = document.createElement('canvas');
      c.width = 560;
      c.height = 160;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 48px "Georgia", serif';
      ctx.fillText(typed.trim(), 24, 100);
      saveSignatureAsset(c.toDataURL('image/png'));
      return;
    }
    const c = canvasRef.current;
    if (!c) return;
    saveSignatureAsset(c.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-[#0f172a]">Мій підпис</h3>
          <button type="button" onClick={() => setSignatureModalOpen(false)} className="p-2 hover:bg-[#f1f5f9] rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'draw' ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f1f5f9] text-[#64748b]'}`}
            >
              Намалювати
            </button>
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'type' ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f1f5f9] text-[#64748b]'}`}
            >
              Ввести текст
            </button>
          </div>

          {mode === 'draw' ? (
            <canvas
              ref={canvasRef}
              width={560}
              height={160}
              className="w-full h-40 border border-[#d1d5db] rounded-xl bg-white touch-none cursor-crosshair"
              onPointerDown={(e) => {
                drawing.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                const ctx = canvasRef.current?.getContext('2d');
                if (!ctx) return;
                const { x, y } = pos(e);
                ctx.beginPath();
                ctx.moveTo(x, y);
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const ctx = canvasRef.current?.getContext('2d');
                if (!ctx) return;
                const { x, y } = pos(e);
                ctx.lineTo(x, y);
                ctx.stroke();
              }}
              onPointerUp={() => {
                drawing.current = false;
              }}
            />
          ) : (
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Ваше імʼя"
              className="w-full rounded-xl border border-[#d1d5db] px-4 py-8 text-3xl italic text-center font-serif"
            />
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={clear} className="flex items-center gap-1 px-3 py-2 text-sm text-[#64748b] hover:bg-[#f1f5f9] rounded-lg">
              <Eraser size={14} /> Очистити
            </button>
            <button
              type="button"
              onClick={save}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg"
            >
              <Check size={14} /> Зберегти підпис
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

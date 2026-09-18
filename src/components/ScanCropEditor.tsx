import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { motion } from 'framer-motion';
import { Check, RotateCcw, RotateCw, X, ZoomIn } from 'lucide-react';
import { getCroppedImageFile } from '../lib/cropImage';
import { useLanguage } from '../contexts/LanguageContext';

interface ScanCropEditorProps {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export function ScanCropEditor({ file, onCancel, onConfirm }: ScanCropEditorProps) {
  const { t } = useLanguage();
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const cropped = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        rotation,
        file.name,
      );
      URL.revokeObjectURL(imageSrc);
      onConfirm(cropped);
    } catch {
      onConfirm(file);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    URL.revokeObjectURL(imageSrc);
    onConfirm(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] bg-black flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(imageSrc);
            onCancel();
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15"
          aria-label={t('cancel')}
        >
          <X size={18} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-semibold">{t('cropImage')}</p>
          <p className="text-white/40 text-[11px]">{t('scanCropHint')}</p>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
        >
          {t('skipCrop')}
        </button>
      </div>

      <div className="relative flex-1 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          showGrid
          objectFit="contain"
        />
      </div>

      <div className="px-4 pt-3 pb-6 space-y-3 border-t border-white/10 bg-black/90">
        <div className="flex items-center gap-3">
          <ZoomIn size={16} className="text-white/40 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-orange-500"
            aria-label={t('zoom')}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => r - 90)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/80 text-sm"
          >
            <RotateCcw size={16} />
            {t('rotateLeft')}
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => r + 90)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/80 text-sm"
          >
            <RotateCw size={16} />
            {t('rotateRight')}
          </button>
        </div>

        <button
          type="button"
          disabled={busy || !croppedAreaPixels}
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold text-sm active:scale-[0.99] transition-all"
        >
          <Check size={18} />
          {busy ? t('processing') : t('applyCrop')}
        </button>
      </div>
    </motion.div>
  );
}

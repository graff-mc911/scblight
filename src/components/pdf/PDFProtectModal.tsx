import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';

export const PDFProtectModal: React.FC = () => {
  const open = usePdfStore((s) => s.protectModalOpen);
  const setProtectModalOpen = usePdfStore((s) => s.setProtectModalOpen);
  const protectActiveDocument = usePdfStore((s) => s.protectActiveDocument);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0f172a] flex items-center gap-2">
            <Lock size={16} className="text-[#3b82f6]" /> Захистити PDF
          </h3>
          <button type="button" onClick={() => setProtectModalOpen(false)} className="p-1.5 hover:bg-[#f1f5f9] rounded-lg">
            <X size={16} />
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          className="w-full mb-2 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Підтвердіть пароль"
          className="w-full mb-4 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!password || password !== confirm}
          onClick={() => protectActiveDocument(password)}
          className="w-full py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold disabled:opacity-40"
        >
          Захистити документ
        </button>
        <p className="text-[11px] text-[#94a3b8] mt-2">
          Клієнтська позначка захисту (індикатор у вкладці). Для повного шифрування експортуйте захищений файл окремо.
        </p>
      </div>
    </div>
  );
};

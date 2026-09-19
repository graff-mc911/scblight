import React, { useRef, useState } from 'react';
import { GripVertical, Image as ImageIcon, FileText, Trash2, Upload } from 'lucide-react';

export type PdfDropFileKind = 'image' | 'pdf' | 'other';

export interface PdfDropFile {
  id: string;
  file: File;
  previewUrl: string | null;
  type: PdfDropFileKind;
}

interface Props {
  files: PdfDropFile[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  accept?: string;
  hint?: string;
  multiple?: boolean;
}

const typeIcon = {
  image: <ImageIcon size={18} className="text-sky-400" />,
  pdf: <FileText size={18} className="text-rose-400" />,
  other: <FileText size={18} className="text-white/50" />,
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const PdfFileDropzone: React.FC<Props> = ({
  files,
  onAdd,
  onRemove,
  onClear,
  accept = 'image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv',
  hint = 'PDF, зображення, текст — до 50 МБ',
  multiple = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div>
      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) onAdd(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-5 ${
          isDragging
            ? 'border-sky-400/60 bg-sky-500/10'
            : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="hidden"
        />
        <Upload size={28} className={`mx-auto mb-3 ${isDragging ? 'text-sky-400' : 'text-white/45'}`} />
        <p className="text-white/85 font-medium mb-1">Перетягніть файли або натисніть для вибору</p>
        <p className="text-white/40 text-sm">{hint}</p>
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <h3 className="text-white/70 text-sm">Файли ({files.length})</h3>
            <button type="button" onClick={onClear} className="text-white/40 hover:text-red-400 text-xs">
              Очистити
            </button>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
            {files.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 ${index < files.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <GripVertical size={14} className="text-white/20" />
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center">
                    {typeIcon[item.type]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.file.name}</p>
                  <p className="text-white/40 text-xs">{formatFileSize(item.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-1.5 hover:text-red-400 text-white/40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

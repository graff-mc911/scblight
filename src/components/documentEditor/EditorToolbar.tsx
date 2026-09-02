import React, { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Strikethrough,
  Table as TableIcon,
  Underline,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  onInsertImage?: (src: string) => void;
  onInsertTable?: () => void;
  onInsertDivider?: () => void;
  onInsertAttachment?: (file: File) => void;
}

const btn =
  'p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30';

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onInsertImage,
  onInsertTable,
  onInsertDivider,
  onInsertAttachment,
}) => {
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt('URL посилання:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const insertImageFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      if (onInsertImage) onInsertImage(src);
      else editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertImageFromUrl = () => {
    const url = window.prompt('URL зображення:');
    if (!url) return;
    if (onInsertImage) onInsertImage(url);
    else editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border border-white/10 rounded-xl mb-3">
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBold().run()} title="Жирний">
        <Bold size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleItalic().run()} title="Курсив">
        <Italic size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Підкреслений">
        <Underline size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleStrike().run()} title="Закреслений">
        <Strikethrough size={16} />
      </button>

      <span className="w-px h-6 bg-white/10 mx-1" />

      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code size={16} />
      </button>

      <span className="w-px h-6 bg-white/10 mx-1" />

      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks size={16} />
      </button>

      <span className="w-px h-6 bg-white/10 mx-1" />

      <button type="button" className={btn} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight size={16} />
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify size={16} />
      </button>

      <span className="w-px h-6 bg-white/10 mx-1" />

      <button type="button" className={btn} onClick={setLink} title="Посилання">
        <LinkIcon size={16} />
      </button>
      <button type="button" className={btn} onClick={insertImageFromUrl} title="Зображення URL">
        <ImageIcon size={16} />
      </button>
      <button type="button" className={btn} onClick={() => imageRef.current?.click()} title="Завантажити зображення">
        <ImageIcon size={16} className="text-orange-400" />
      </button>
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={insertImageFromFile} />

      {onInsertTable && (
        <button type="button" className={btn} onClick={onInsertTable} title="Таблиця">
          <TableIcon size={16} />
        </button>
      )}
      {onInsertDivider && (
        <button type="button" className={btn} onClick={onInsertDivider} title="Роздільник">
          <Minus size={16} />
        </button>
      )}
      {onInsertAttachment && (
        <>
          <button type="button" className={btn} onClick={() => fileRef.current?.click()} title="Вкладення">
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onInsertAttachment(f);
              e.target.value = '';
            }}
          />
        </>
      )}

      <input
        type="color"
        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
        title="Колір тексту"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Підсвітка"
      >
        <Highlighter size={16} />
      </button>
    </div>
  );
};
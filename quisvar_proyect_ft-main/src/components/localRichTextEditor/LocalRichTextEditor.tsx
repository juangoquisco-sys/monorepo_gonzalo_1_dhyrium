import { useEffect, type CSSProperties } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react';

import './localRichTextEditor.css';

interface LocalRichTextEditorProps {
  initialContent?: string;
  minHeight?: number;
  onChange: (html: string) => void;
}

const extensions = [
  StarterKit.configure({ link: false }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  Link.configure({ openOnClick: false, autolink: true }),
  TableKit.configure({ table: { resizable: true } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];

const LocalRichTextEditor = ({
  initialContent = '<p></p>',
  minHeight = 260,
  onChange,
}: LocalRichTextEditorProps) => {
  const editor = useEditor({
    extensions,
    content: initialContent || '<p></p>',
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: 'local-rich-text-editor__content',
        lang: 'es',
        spellcheck: 'true',
        'aria-label': 'Editor de texto enriquecido',
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });

  useEffect(() => {
    if (!editor || !initialContent || editor.getHTML() === initialContent) return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  const button = (
    label: string,
    active: boolean,
    icon: React.ReactNode,
    action: () => void
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={active ? 'is-active' : undefined}
      onMouseDown={event => event.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="local-rich-text-editor"
      style={{ '--local-editor-min-height': `${minHeight}px` } as CSSProperties}
    >
      <div className="local-rich-text-editor__toolbar" role="toolbar" aria-label="Formato del texto">
        {button('Deshacer', false, <Undo2 />, () => editor?.chain().focus().undo().run())}
        {button('Rehacer', false, <Redo2 />, () => editor?.chain().focus().redo().run())}
        <span className="local-rich-text-editor__separator" />
        <select
          aria-label="Estilo de pÃ¡rrafo"
          value={editor?.isActive('heading', { level: 1 }) ? 'h1' : editor?.isActive('heading', { level: 2 }) ? 'h2' : 'p'}
          onChange={event => {
            if (event.target.value === 'h1') editor?.chain().focus().setHeading({ level: 1 }).run();
            else if (event.target.value === 'h2') editor?.chain().focus().setHeading({ level: 2 }).run();
            else editor?.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">Normal</option>
          <option value="h1">TÃ­tulo 1</option>
          <option value="h2">TÃ­tulo 2</option>
        </select>
        <select
          aria-label="Fuente"
          value={editor?.getAttributes('textStyle').fontFamily ?? 'Aptos, Calibri, Arial, sans-serif'}
          onChange={event => editor?.chain().focus().setFontFamily(event.target.value).run()}
        >
          <option value="Aptos, Calibri, Arial, sans-serif">Aptos</option>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Calibri, Arial, sans-serif">Calibri</option>
          <option value="Times New Roman, Times, serif">Times New Roman</option>
        </select>
        {button('Negrita', editor?.isActive('bold') ?? false, <Bold />, () => editor?.chain().focus().toggleBold().run())}
        {button('Cursiva', editor?.isActive('italic') ?? false, <Italic />, () => editor?.chain().focus().toggleItalic().run())}
        {button('Subrayado', editor?.isActive('underline') ?? false, <Underline />, () => editor?.chain().focus().toggleUnderline().run())}
        {button('Tachado', editor?.isActive('strike') ?? false, <Strikethrough />, () => editor?.chain().focus().toggleStrike().run())}
        <label className="local-rich-text-editor__color" title="Color de texto">
          A
          <input type="color" defaultValue="#111827" onChange={event => editor?.chain().focus().setColor(event.target.value).run()} />
        </label>
        <label className="local-rich-text-editor__color local-rich-text-editor__color--highlight" title="Resaltado">
          A
          <input type="color" defaultValue="#fff59d" onChange={event => editor?.chain().focus().setHighlight({ color: event.target.value }).run()} />
        </label>
        <span className="local-rich-text-editor__separator" />
        {button('ViÃ±etas', editor?.isActive('bulletList') ?? false, <List />, () => editor?.chain().focus().toggleBulletList().run())}
        {button('NumeraciÃ³n', editor?.isActive('orderedList') ?? false, <ListOrdered />, () => editor?.chain().focus().toggleOrderedList().run())}
        {button('Alinear a la izquierda', editor?.isActive({ textAlign: 'left' }) ?? false, <AlignLeft />, () => editor?.chain().focus().setTextAlign('left').run())}
        {button('Centrar', editor?.isActive({ textAlign: 'center' }) ?? false, <AlignCenter />, () => editor?.chain().focus().setTextAlign('center').run())}
        {button('Alinear a la derecha', editor?.isActive({ textAlign: 'right' }) ?? false, <AlignRight />, () => editor?.chain().focus().setTextAlign('right').run())}
        {button('Justificar', editor?.isActive({ textAlign: 'justify' }) ?? false, <AlignJustify />, () => editor?.chain().focus().setTextAlign('justify').run())}
        {button('Insertar tabla', false, <Table2 />, () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
        {button('Quitar formato', false, <RemoveFormatting />, () => editor?.chain().focus().unsetAllMarks().clearNodes().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default LocalRichTextEditor;

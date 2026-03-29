import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Heading3, ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useCallback } from 'react';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: true,
        },
        paragraph: {
          HTMLAttributes: {},
        },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg' },
      }),
      Youtube.configure({
        HTMLAttributes: { class: 'w-full aspect-video rounded-lg' },
        width: 640,
        height: 360,
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      // Replace empty paragraphs with ones containing <br> so spacing is preserved on render
      const html = editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL Gambar:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL YouTube:');
    if (url) editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button type="button" size="icon" variant={active ? 'default' : 'outline'} className="h-8 w-8" onClick={onClick} title={title}>
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={addImage} title="Tambah Gambar"><ImageIcon className="h-4 w-4" /></Btn>
        <Btn onClick={addYoutube} title="Tambah Video YouTube"><Video className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[150px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[130px] [&_.ProseMirror_p]:mb-2" />
    </div>
  );
}

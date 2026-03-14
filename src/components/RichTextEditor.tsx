import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Heading3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) => (
    <Button type="button" size="icon" variant={active ? 'default' : 'outline'} className="h-8 w-8" onClick={onClick}>
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[150px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[130px]" />
    </div>
  );
}

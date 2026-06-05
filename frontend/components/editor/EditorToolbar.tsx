import { useEffect, useState } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  editor: Editor | null;
  saveStatus?: "saved" | "saving" | "unsaved";
}

export function EditorToolbar({ editor, saveStatus }: EditorToolbarProps) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      forceUpdate({});
    };

    editor.on("transaction", handleTransaction);

    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className="border border-input rounded-t-md p-1 flex flex-wrap gap-1 items-center bg-background sticky top-0 z-10"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex justify-between w-full gap-1 border-r pr-1 mr-1">
        <div className="flex">
          <Button
            variant={
              editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant={
              editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant={
              editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 border-r pr-1 mr-1">
            <Button
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive("code") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().chain().focus().toggleCode().run()}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-r pr-1 mr-1">
            <Button
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Ordered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <div className="text-xs text-muted-foreground bg-muted/80 px-2 py-1 rounded">
              Saving...
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="text-xs text-success bg-success/20 px-2 py-1 rounded">
              Saved
            </div>
          )}
          <Button>Save</Button>
        </div>
      </div>
    </div>
  );
}

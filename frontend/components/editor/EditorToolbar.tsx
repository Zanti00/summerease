import { useEffect, useState, useRef } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Code,
  Highlighter,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  ChevronDown,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
  documentId: string;
}

const FONT_FAMILIES = [
  { name: "Comic Sans", value: "Comic Sans MS, Comic Sans" },
  { name: "Serif", value: "serif" },
  { name: "Monospace", value: "monospace" },
  { name: "Cursive", value: "cursive" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px"];
const LINE_HEIGHTS = ["1", "1.15", "normal", "1.5", "2", "2.5", "3"];

export function EditorToolbar({ editor, documentId }: EditorToolbarProps) {
  const [, forceUpdate] = useState({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      // Need to dynamically import getAuthToken or pass it down, but we can just import it since it's a client component.
      // Wait, we can import getAuthToken from "@/lib/actions/authActions"
      // Actually, let's just use fetch directly.
      const { getAuthToken } = await import("@/lib/actions/authActions");
      const token = await getAuthToken();

      const { API_BASE_URL } = await import("@/lib/apiConfig");
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/images/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process image");
      }

      const data = await response.json();
      
      // Build the image node with extracted text as alt text
      const attrs: Record<string, string> = { src: data.base64 };
      if (data.extracted_text) {
        attrs.alt = data.extracted_text.replace(/\n/g, ' ');
      }

      const nodes: any[] = [
        {
          type: 'image',
          attrs
        }
      ];

      // Insert image
      editor.chain().focus().insertContent(nodes).run();
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
        <div className="flex flex-wrap items-center gap-1">
          {/* Font Family */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-27.5">
              <span className="truncate">
                {FONT_FAMILIES.find(
                  (f) =>
                    f.value === editor.getAttributes("textStyle").fontFamily,
                )?.name || "Inter"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
             <DropdownMenuContent>
              {(() => {
                const currentFont = editor.getAttributes("textStyle").fontFamily;
                const isInterSelected = !currentFont || currentFont === "Inter";
                return (
                  <>
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().unsetFontFamily().run()}
                      className={cn(
                        isInterSelected && "bg-accent/50 font-semibold text-accent-foreground"
                      )}
                    >
                      Inter
                    </DropdownMenuItem>
                    {FONT_FAMILIES.map((font) => {
                      const isSelected = currentFont === font.value;
                      return (
                        <DropdownMenuItem
                          key={font.name}
                          onClick={() =>
                            editor.chain().focus().setFontFamily(font.value).run()
                          }
                          style={{ fontFamily: font.value }}
                          className={cn(
                            isSelected && "bg-accent/50 font-semibold text-accent-foreground"
                          )}
                        >
                          {font.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                );
              })()}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Font Size */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-17.5">
              <span className="truncate">
                {editor
                  .getAttributes("textStyle")
                  .fontSize?.replace("px", "") || "16"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(() => {
                const currentSize = editor.getAttributes("textStyle").fontSize || "16px";
                return FONT_SIZES.map((size) => {
                  const isSelected = currentSize === size;
                  return (
                    <DropdownMenuItem
                      key={size}
                      onClick={() =>
                        size === "16px"
                          ? editor.chain().focus().unsetFontSize().run()
                          : editor.chain().focus().setFontSize(size).run()
                      }
                      className={cn(
                        isSelected && "bg-accent/50 font-semibold text-accent-foreground"
                      )}
                    >
                      {size}
                    </DropdownMenuItem>
                  );
                });
              })()}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text Color */}
          <div className="flex items-center">
            <div className="relative flex items-center">
              <input
                type="color"
                onInput={(event) =>
                  editor
                    .chain()
                    .focus()
                    .setColor((event.target as HTMLInputElement).value)
                    .run()
                }
                value={editor.getAttributes("textStyle").color || "#000000"}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Text Color"
              />
              <Button
                variant="ghost"
                size="sm"
                className="pointer-events-none flex gap-1 px-2"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
                <div
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                  style={{
                    backgroundColor:
                      editor.getAttributes("textStyle").color || "transparent",
                  }}
                />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().unsetColor().run()}
              title="Reset Text Color"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Highlight Color */}
          <div className="flex items-center border-r pr-1 mr-1">
            <div className="relative flex items-center">
              <input
                type="color"
                onInput={(event) =>
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({
                      color: (event.target as HTMLInputElement).value,
                    })
                    .run()
                }
                value={editor.getAttributes("highlight").color || "#ffff00"}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Highlight Color"
              />
              <Button
                variant={editor.isActive("highlight") ? "secondary" : "ghost"}
                size="sm"
                className="pointer-events-none flex gap-1 px-2"
                title="Highlight Color"
              >
                <Highlighter className="h-4 w-4" />
                <div
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                  style={{
                    backgroundColor:
                      editor.getAttributes("highlight").color || "transparent",
                  }}
                />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              title="Reset Highlight Color"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

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
              variant={editor.isActive("underline") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
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
              variant={
                editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"
              }
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={
                editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"
              }
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={
                editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"
              }
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant={
                editor.isActive({ textAlign: "justify" })
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-r pr-1 mr-1">
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
            <Button
              variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
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
              variant="ghost"
              size="sm"
              onClick={() =>
                (
                  editor.chain().focus() as unknown as {
                    indent: () => { run: () => boolean };
                  }
                )
                  .indent()
                  .run()
              }
              title="Increase Indent"
            >
              <IndentIncrease className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                (
                  editor.chain().focus() as unknown as {
                    outdent: () => { run: () => boolean };
                  }
                )
                  .outdent()
                  .run()
              }
              title="Decrease Indent"
            >
              <IndentDecrease className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-r pr-1 mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 w-22.5">
                <span className="truncate">
                  {(() => {
                    const lh =
                      editor.getAttributes("paragraph")?.lineHeight ||
                      editor.getAttributes("heading")?.lineHeight;
                    return lh === "normal" || !lh ? "normal" : lh;
                  })()}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(() => {
                  const rawLh =
                    editor.getAttributes("paragraph")?.lineHeight ||
                    editor.getAttributes("heading")?.lineHeight;
                  const currentLh = rawLh === "normal" || !rawLh ? "normal" : rawLh;
                  return LINE_HEIGHTS.map((lh) => {
                    const isSelected = currentLh === lh;
                    return (
                      <DropdownMenuItem
                        key={lh}
                        onClick={() =>
                          lh === "normal"
                            ? editor.chain().focus().unsetLineHeight().run()
                            : editor.chain().focus().setLineHeight(lh).run()
                        }
                        className={cn(
                          isSelected && "bg-accent/50 font-semibold text-accent-foreground"
                        )}
                      >
                        {lh}
                      </DropdownMenuItem>
                    );
                  });
                })()}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1 border-r pr-1 mr-1">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Insert Image"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
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
      </div>
    </div>
  );
}

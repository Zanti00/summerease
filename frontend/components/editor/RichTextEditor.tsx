"use client";

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";

import { FontSize } from "./extensions/FontSize";
import { LineHeight } from "./extensions/LineHeight";
import { Indent } from "./extensions/Indent";
import { EditorToolbar } from "./EditorToolbar";
import { useMutation } from "@tanstack/react-query";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileMenu } from "./FileMenu";
import { DeleteDocumentTrigger } from "@/components/delete-document-trigger";
import { useEditorStore } from "@/hooks/use-editor-store";

import { getAuthToken } from "@/lib/actions/authActions";
import { ROUTES } from "@/app/constants/routes";
import { API_BASE_URL } from "@/lib/apiConfig";

import { createPortal } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RichTextEditorProps {
  documentId: string;
  initialContent: Record<string, unknown> | string;
  initialAutoSave?: boolean;
  originalFileUrl?: string;
  documentTitle?: string;
}

export function RichTextEditor({
  documentId,
  initialContent,
  initialAutoSave = false,
  originalFileUrl,
  documentTitle,
}: RichTextEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [saveStatus, setSaveStatus] = useState<"unmodified" | "saved" | "saving" | "unsaved">(
    "unmodified",
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(initialAutoSave);
  const autoSaveRef = useRef(isAutoSaveEnabled);

  const [title, setTitle] = useState(documentTitle || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(documentTitle || "");

  useEffect(() => {
    if (documentTitle) {
      const timer = setTimeout(() => {
        setTitle(documentTitle);
        setTitleInput(documentTitle);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [documentTitle]);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    const trimmedTitle = titleInput.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      setTitle(trimmedTitle);
      setSaveStatus("saving");
      saveMutation.mutate({
        content: editor?.getJSON() || {},
        content_html: editor?.getHTML() || "",
        title: trimmedTitle,
      });
    } else {
      setTitleInput(title);
    }
  };

  const handleCancelRename = () => {
    setIsEditingTitle(false);
    setTitleInput(title);
  };

  useEffect(() => {
    autoSaveRef.current = isAutoSaveEnabled;
  }, [isAutoSaveEnabled]);

  const handleDownload = () => {
    if (originalFileUrl) {
      const link = document.createElement("a");
      link.href = originalFileUrl;
      link.target = "_blank";
      link.download = documentTitle || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRename = () => {
    setIsEditingTitle(true);
  };

  const handlePrint = () => {
    const printContent = editor?.getHTML() || "";
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${documentTitle || "Document"}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleAutoSaveChange = (enabled: boolean) => {
    setIsAutoSaveEnabled(enabled);
    if (editor) {
      setSaveStatus("saving");
      saveMutation.mutate({
        content: editor.getJSON(),
        content_html: editor.getHTML(),
        is_autosave_enabled: enabled,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({
      content,
      content_html,
      is_autosave_enabled,
      title,
    }: {
      content: Record<string, unknown>;
      content_html: string;
      is_autosave_enabled?: boolean;
      title?: string;
    }) => {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/documents/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ content, content_html, is_autosave_enabled, title }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to autosave");
      }
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      setSaveStatus("unsaved");
      // Could show a toast error here
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      FontFamily,
      FontSize,
      LineHeight,
      Indent,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-125 prose-p:my-0",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("unsaved");

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (autoSaveRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus("saving");
          saveMutation.mutate({ content: editor.getJSON(), content_html: editor.getHTML() });
        }, 2000); // 2 second debounce
      }
    },
  });

  const handleSave = () => {
    if (editor) {
      setSaveStatus("saving");
      saveMutation.mutate({ content: editor.getJSON(), content_html: editor.getHTML() });
    }
  };

  const { setEditor } = useEditorStore();

  const [mounted, setMounted] = useState(false);

  // Cleanup timeout on unmount and track mount status
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      setMounted(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
    return () => setEditor(null);
  }, [editor, setEditor]);

  return (
    <DeleteDocumentTrigger
      documentId={documentId}
      documentName={documentTitle || "document"}
      onSuccess={() => router.push(ROUTES.documents.root)}
    >
      {({ onClick: handleDeleteClick }) => (
        <div className="flex flex-col border rounded-md shadow-sm bg-card overflow-hidden">
          <EditorToolbar editor={editor} />
          <div className="relative">
            <EditorContent editor={editor} className="min-h-125" />
          </div>

          {mounted && typeof window !== "undefined" && document.getElementById("editor-header-actions")
            ? createPortal(
                <div className="flex items-center gap-4">
                  <FileMenu
                    onSave={handleSave}
                    isSaving={saveStatus === "saving"}
                    onDownload={handleDownload}
                    isDownloadDisabled={!originalFileUrl}
                    onRename={handleRename}
                    onPrint={handlePrint}
                    onDelete={handleDeleteClick}
                  />

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autosave-mode"
                      checked={isAutoSaveEnabled}
                      onCheckedChange={handleAutoSaveChange}
                    />
                    <Label htmlFor="autosave-mode" className="text-xs">
                      Autosave
                    </Label>
                  </div>
                </div>,
                document.getElementById("editor-header-actions")!
              )
            : null}

          {mounted && typeof window !== "undefined" && document.getElementById("editor-save-status")
            ? createPortal(
                <div className="flex items-center gap-2">
                  {saveStatus === "unmodified" && (
                    <div className="text-xs text-muted-foreground bg-muted/80 px-2 py-1 rounded">
                      Unmodified
                    </div>
                  )}
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
                  {saveStatus === "unsaved" && (
                    <div className="text-xs text-destructive bg-destructive/20 px-2 py-1 rounded">
                      Unsaved
                    </div>
                  )}
                </div>,
                document.getElementById("editor-save-status")!
              )
            : null}

          {mounted && typeof window !== "undefined" && document.getElementById("editor-title")
            ? createPortal(
                isEditingTitle ? (
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") handleCancelRename();
                    }}
                    autoFocus
                    className="text-2xl font-bold tracking-tight text-foreground bg-transparent border-b border-foreground/50 focus:outline-none px-2 py-0.5 focus:border-foreground min-w-50"
                  />
                ) : (
                  <h1
                    className="text-2xl font-bold tracking-tight text-foreground truncate cursor-pointer hover:bg-muted/30 px-2 py-0.5 rounded"
                    onClick={() => setIsEditingTitle(true)}
                    title="Click to rename"
                  >
                    {title}
                  </h1>
                ),
                document.getElementById("editor-title")!
              )
            : null}
        </div>
      )}
    </DeleteDocumentTrigger>
  );
}

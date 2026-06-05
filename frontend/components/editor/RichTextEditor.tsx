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

import { getAuthToken } from "@/lib/actions/authActions";

import { createPortal } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  documentId: string;
  initialContent: Record<string, unknown> | string;
  initialAutoSave?: boolean;
}

export function RichTextEditor({
  documentId,
  initialContent,
  initialAutoSave = false,
}: RichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(initialAutoSave);
  const autoSaveRef = useRef(isAutoSaveEnabled);

  useEffect(() => {
    autoSaveRef.current = isAutoSaveEnabled;
  }, [isAutoSaveEnabled]);

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
    }: {
      content: Record<string, unknown>;
      content_html: string;
      is_autosave_enabled?: boolean;
    }) => {
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ content, content_html, is_autosave_enabled }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to autosave");
      }
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
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

  return (
    <div className="flex flex-col border rounded-md shadow-sm bg-card overflow-hidden">
      <EditorToolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} className="min-h-125" />
      </div>

      {mounted && typeof window !== "undefined" && document.getElementById("editor-header-actions")
        ? createPortal(
            <div className="flex items-center gap-4">
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
                {saveStatus === "unsaved" && (
                  <div className="text-xs text-destructive bg-destructive/20 px-2 py-1 rounded">
                    Unsaved
                  </div>
                )}
              </div>
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
              <Button onClick={handleSave} disabled={saveStatus === "saving"} size="sm">
                Save
              </Button>
            </div>,
            document.getElementById("editor-header-actions")!
          )
        : null}
    </div>
  );
}

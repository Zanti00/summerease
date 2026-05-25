"use client";

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { EditorToolbar } from "./EditorToolbar";
import { useMutation } from "@tanstack/react-query";

import { getAuthToken } from "@/lib/actions/authActions";

interface RichTextEditorProps {
  documentId: string;
  initialContent: Record<string, any> | string;
}

export function RichTextEditor({ documentId, initialContent }: RichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (content: Record<string, any>) => {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ content }),
      });
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
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 min-h-[500px]",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("unsaved");
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus("saving");
        saveMutation.mutate(editor.getJSON());
      }, 2000); // 2 second debounce
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col border rounded-md shadow-sm bg-white overflow-hidden">
      <EditorToolbar editor={editor} />
      <div className="relative">
        {saveStatus === "saving" && (
          <div className="absolute top-2 right-4 text-xs text-slate-400 bg-slate-50/80 px-2 py-1 rounded">
            Saving...
          </div>
        )}
        {saveStatus === "saved" && (
          <div className="absolute top-2 right-4 text-xs text-green-500 bg-green-50/80 px-2 py-1 rounded">
            Saved
          </div>
        )}
        <EditorContent editor={editor} className="min-h-[500px]" />
      </div>
    </div>
  );
}

import { create } from "zustand";
import { Editor } from "@tiptap/react";

interface EditorStore {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  getContentHtml: () => string | null;
  setContent: (html: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  getContentHtml: () => {
    const editor = get().editor;
    if (!editor) return null;
    return editor.getHTML();
  },
  setContent: (html: string) => {
    const editor = get().editor;
    if (!editor) return;
    editor.commands.setContent(html);
  },
}));

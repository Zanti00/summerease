import { create } from "zustand";
import { Editor } from "@tiptap/react";

interface EditorStore {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  getContentHtml: () => string | null;
  setContent: (html: string) => void;
  getSelectedHtml: () => string | null;
  replaceSelection: (html: string) => void;
  replaceSpecificText: (targetText: string, newHtml: string) => boolean;
  lastSelectedHtml: string | null;
  setLastSelectedHtml: (html: string | null) => void;
  lastSelectionRange: { from: number; to: number } | null;
  setLastSelectionRange: (range: { from: number; to: number } | null) => void;
  pendingQuery: string | null;
  setPendingQuery: (query: string | null) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  lastSelectedHtml: null,
  setLastSelectedHtml: (html) => set({ lastSelectedHtml: html }),
  lastSelectionRange: null,
  setLastSelectionRange: (range) => set({ lastSelectionRange: range }),
  pendingQuery: null,
  setPendingQuery: (query) => set({ pendingQuery: query }),
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
  getSelectedHtml: () => {
    return get().lastSelectedHtml;
  },
  replaceSelection: (html: string) => {
    const editor = get().editor;
    if (!editor) return;
    
    const range = get().lastSelectionRange;
    if (range) {
      editor.commands.insertContentAt(range, html);
      // Clear range after using it to avoid stale replacements
      get().setLastSelectionRange(null);
      get().setLastSelectedHtml(null);
    } else {
      editor.commands.insertContent(html);
    }
  },
  replaceSpecificText: (targetText: string, newHtml: string) => {
    const editor = get().editor;
    if (!editor) return false;
    
    const currentHtml = editor.getHTML();
    
    if (currentHtml.includes(targetText)) {
      const updatedHtml = currentHtml.replace(targetText, newHtml);
      editor.commands.setContent(updatedHtml);
      return true;
    }
    
    // Fallback if exact match fails (e.g. whitespace differences)
    // We could implement fuzzy matching here later, but for now return false.
    return false;
  }
}));

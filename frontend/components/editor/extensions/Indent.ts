import { Extension } from "@tiptap/core";
import { Transaction, EditorState } from "@tiptap/pm/state";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface IndentOptions {
  types: string[];
  indentLevels: number;
  minLevel: number;
  maxLevel: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      /**
       * Increase the indent
       */
      indent: () => ReturnType;
      /**
       * Decrease the indent
       */
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<IndentOptions>({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote"],
      indentLevels: 24, // 24px per level
      minLevel: 0,
      maxLevel: 8, // Max 8 levels of indent
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const paddingLeft = element.style.paddingLeft;
              if (paddingLeft) {
                const px = parseInt(paddingLeft, 10);
                if (!isNaN(px)) {
                  return Math.floor(px / this.options.indentLevels);
                }
              }
              return 0;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              if (attributes.indent === 0) {
                return {};
              }
              const indentValue = attributes.indent as number;
              return {
                style: `padding-left: ${indentValue * this.options.indentLevels}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch: ((args: any) => void) | undefined }) => {
          const { selection } = state;
          let trUpdated = tr;

          state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = (node.attrs.indent as number) || 0;
              if (currentIndent < this.options.maxLevel) {
                trUpdated = trUpdated.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                });
              }
            }
          });

          if (dispatch) {
            dispatch(trUpdated);
            return true;
          }
          return false;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch: ((args: any) => void) | undefined }) => {
          const { selection } = state;
          let trUpdated = tr;

          state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = (node.attrs.indent as number) || 0;
              if (currentIndent > this.options.minLevel) {
                trUpdated = trUpdated.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1,
                });
              }
            }
          });

          if (dispatch) {
            dispatch(trUpdated);
            return true;
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      "Shift-Tab": () => this.editor.commands.outdent(),
    };
  },
});

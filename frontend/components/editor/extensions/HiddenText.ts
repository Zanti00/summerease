import { Mark, mergeAttributes } from "@tiptap/core";

export const HiddenText = Mark.create({
  name: "hiddenText",

  parseHTML() {
    return [
      {
        tag: "span.hidden-ocr",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "hidden-ocr",
        style: "display: none; height: 0; width: 0; overflow: hidden; position: absolute;",
      }),
      0,
    ];
  },
});

import type Editor from '@hufe921/canvas-editor';
import type { IRangeStyle } from '@hufe921/canvas-editor';

export class EditorStateAdapter {
  constructor(
    readonly editor: Editor | null,
    readonly rangeStyle: Partial<IRangeStyle>
  ) {}

  get command() {
    return this.editor?.command;
  }

  get available() {
    return Boolean(this.command);
  }

  get selectedText() {
    return this.command?.getRangeText() ?? '';
  }

  get hasSelection() {
    const range = this.command?.getRange();
    return this.selectedText.length > 0 || Boolean(range && range.startIndex !== range.endIndex);
  }

  get isInTable() {
    return Boolean(this.command?.getRangeContext()?.isTable);
  }

  booleanState(property: keyof IRangeStyle) {
    const selectedValues = new Set(
      (this.command?.getRangeContext()?.selectionElementList ?? [])
        .filter(element => element.value !== '\n')
        .map(element => Boolean(element[property as keyof typeof element]))
    );
    if (this.hasSelection && selectedValues.size > 0) {
      return {
        active: selectedValues.size === 1 && selectedValues.has(true),
        mixed: selectedValues.size > 1,
      };
    }
    const value = this.rangeStyle[property];
    return {
      active: value === true,
      mixed: value === undefined && this.hasSelection,
    };
  }
}

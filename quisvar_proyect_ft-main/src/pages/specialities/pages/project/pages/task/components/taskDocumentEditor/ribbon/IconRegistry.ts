import {
  BorderAll24Regular,
  ClipboardPaste24Regular,
  Copy24Regular,
  Cut24Regular,
  FontDecrease24Regular,
  FontIncrease24Regular,
  Highlight24Regular,
  PaintBrush24Regular,
  PaintBucket24Regular,
  Search24Regular,
  SelectAllOn24Regular,
  StyleGuide24Regular,
  TextAlignCenter24Filled,
  TextAlignCenter24Regular,
  TextAlignJustify24Filled,
  TextAlignJustify24Regular,
  TextAlignLeft24Filled,
  TextAlignLeft24Regular,
  TextAlignRight24Filled,
  TextAlignRight24Regular,
  TextBold24Filled,
  TextBold24Regular,
  TextBulletListLtr24Filled,
  TextBulletListLtr24Regular,
  TextBulletListTree24Regular,
  TextChangeCase24Regular,
  TextClearFormatting24Regular,
  TextColor24Regular,
  TextFont24Regular,
  TextFontSize24Regular,
  TextIndentDecreaseLtr24Regular,
  TextIndentIncreaseLtr24Regular,
  TextItalic24Filled,
  TextItalic24Regular,
  TextLineSpacing24Regular,
  TextNumberListLtr24Filled,
  TextNumberListLtr24Regular,
  TextParagraph24Filled,
  TextParagraph24Regular,
  TextSortAscending24Regular,
  TextStrikethrough24Filled,
  TextStrikethrough24Regular,
  TextSubscript24Filled,
  TextSubscript24Regular,
  TextSuperscript24Filled,
  TextSuperscript24Regular,
  TextUnderline24Filled,
  TextUnderline24Regular,
  type FluentIcon,
} from '@fluentui/react-icons';

interface IconPair {
  regular: FluentIcon;
  filled?: FluentIcon;
}

const icons = new Map<string, IconPair>([
  ['clipboard-paste', { regular: ClipboardPaste24Regular }],
  ['cut', { regular: Cut24Regular }],
  ['copy', { regular: Copy24Regular }],
  ['format-painter', { regular: PaintBrush24Regular }],
  ['font', { regular: TextFont24Regular }],
  ['font-size', { regular: TextFontSize24Regular }],
  ['font-grow', { regular: FontIncrease24Regular }],
  ['font-shrink', { regular: FontDecrease24Regular }],
  ['change-case', { regular: TextChangeCase24Regular }],
  ['clear-formatting', { regular: TextClearFormatting24Regular }],
  ['paragraph', { regular: TextParagraph24Regular, filled: TextParagraph24Filled }],
  ['styles', { regular: StyleGuide24Regular }],
  ['search', { regular: Search24Regular }],
  ['replace', { regular: Search24Regular }],
  ['select-all', { regular: SelectAllOn24Regular }],
  ['bold', { regular: TextBold24Regular, filled: TextBold24Filled }],
  ['italic', { regular: TextItalic24Regular, filled: TextItalic24Filled }],
  ['underline', { regular: TextUnderline24Regular, filled: TextUnderline24Filled }],
  ['strike', { regular: TextStrikethrough24Regular, filled: TextStrikethrough24Filled }],
  ['subscript', { regular: TextSubscript24Regular, filled: TextSubscript24Filled }],
  ['superscript', { regular: TextSuperscript24Regular, filled: TextSuperscript24Filled }],
  ['font-color', { regular: TextColor24Regular }],
  ['highlight', { regular: Highlight24Regular }],
  ['bullets', { regular: TextBulletListLtr24Regular, filled: TextBulletListLtr24Filled }],
  ['numbering', { regular: TextNumberListLtr24Regular, filled: TextNumberListLtr24Filled }],
  ['multilevel', { regular: TextBulletListTree24Regular }],
  ['outdent', { regular: TextIndentDecreaseLtr24Regular }],
  ['indent', { regular: TextIndentIncreaseLtr24Regular }],
  ['sort', { regular: TextSortAscending24Regular }],
  ['align-left', { regular: TextAlignLeft24Regular, filled: TextAlignLeft24Filled }],
  ['align-center', { regular: TextAlignCenter24Regular, filled: TextAlignCenter24Filled }],
  ['align-right', { regular: TextAlignRight24Regular, filled: TextAlignRight24Filled }],
  ['align-justify', { regular: TextAlignJustify24Regular, filled: TextAlignJustify24Filled }],
  ['line-spacing', { regular: TextLineSpacing24Regular }],
  ['shading', { regular: PaintBucket24Regular }],
  ['borders', { regular: BorderAll24Regular }],
]);

export class IconRegistry {
  resolve(id: string, active = false) {
    const pair = icons.get(id);
    return active && pair?.filled ? pair.filled : pair?.regular;
  }

  has(id: string) {
    return icons.has(id);
  }
}

export const writerIconRegistry = new IconRegistry();

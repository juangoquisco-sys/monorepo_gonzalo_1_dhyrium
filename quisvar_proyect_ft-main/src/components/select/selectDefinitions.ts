import type { StylesVariant } from '@/types/types';

export const STYLE_SELECT: { [key in StylesVariant]: string } = {
  primary: 'select-field',
  secondary: 'select-style-two',
  tertiary: 'select-filter-small',
};
export const STYLE_SELECT_ADVANCE: { [key in StylesVariant]: string } = {
  primary: 'AdvancedSelect',
  secondary: 'secondary',
  tertiary: 'select-style-two select-filter-small',
};

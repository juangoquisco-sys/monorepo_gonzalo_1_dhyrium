import type { ReactNode } from 'react';

export type RibbonTabId =
  | 'file'
  | 'home'
  | 'insert'
  | 'draw'
  | 'design'
  | 'layout'
  | 'references'
  | 'mailings'
  | 'review'
  | 'view'
  | 'help'
  | 'table'
  | 'image'
  | 'shape'
  | 'chart'
  | 'header-footer';

export type RibbonControlType =
  | 'button'
  | 'toggle'
  | 'menu'
  | 'split-button'
  | 'combo'
  | 'gallery'
  | 'dialog-launcher';

export type RibbonLayoutMode = 'full' | 'compact' | 'collapsed' | 'overflow';
export type RibbonCommandStatus = 'idle' | 'pending';
export type RibbonUndoTransaction = 'editor-native' | 'custom' | 'none';

export interface RibbonControl {
  id: string;
  commandId: string;
  label: string;
  type: RibbonControlType;
  icon: string;
  keyTip?: string;
  shortcut?: string;
  priority: number;
  large?: boolean;
}

export interface RibbonGallery extends RibbonControl {
  type: 'gallery';
  itemIds: string[];
}

export interface RibbonMenu extends RibbonControl {
  type: 'menu';
  itemIds: string[];
}

export interface RibbonSplitButton extends RibbonControl {
  type: 'split-button';
  defaultCommandId: string;
  menuItemIds: string[];
}

export interface RibbonGroup {
  id: string;
  label: string;
  icon: string;
  priority: number;
  controls: RibbonControl[];
  preferredWidths: Record<Exclude<RibbonLayoutMode, 'overflow'>, number>;
  canOverflow?: boolean;
}

export interface RibbonTab {
  id: RibbonTabId;
  label: string;
  keyTip: string;
  groups: RibbonGroup[];
  contextual?: boolean;
  context?: 'table' | 'image' | 'shape' | 'chart' | 'header-footer';
}

export interface RibbonSchema {
  version: number;
  tabs: RibbonTab[];
}

export interface RibbonCommandDefinition<TContext, TPayload = unknown> {
  id: string;
  label: string;
  tooltip: string;
  execute: (context: TContext, payload: TPayload) => void | Promise<void>;
  canExecute?: (context: TContext, payload?: TPayload) => boolean;
  isActive?: (context: TContext) => boolean;
  isMixed?: (context: TContext) => boolean;
  currentValue?: (context: TContext) => unknown;
  disabledReason?: (context: TContext) => string | undefined;
  pending?: (context: TContext) => boolean;
  shortcut?: string;
  keyTip?: string;
  undoTransaction: RibbonUndoTransaction;
}

export interface RibbonOverflowItem {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
}


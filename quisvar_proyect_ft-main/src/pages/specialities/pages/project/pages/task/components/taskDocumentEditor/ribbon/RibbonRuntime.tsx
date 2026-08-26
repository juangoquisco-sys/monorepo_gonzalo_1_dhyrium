import { createContext, useContext, type ReactNode } from 'react';
import type { IRangeStyle } from '@hufe921/canvas-editor';

import { CommandRegistry } from './CommandRegistry';
import { EditorStateAdapter } from './EditorStateAdapter';

export interface RibbonCommandContext {
  adapter: EditorStateAdapter;
  showFormattingMarks: boolean;
  actions: {
    applyStyle: (styleId: string) => void;
    changeCase: (mode: 'sentence' | 'lower' | 'upper' | 'title' | 'toggle') => void;
    closeEditing: () => void;
    openEditing: (mode: 'search' | 'replace') => void;
    patchRangeStyle: (patch: Partial<IRangeStyle>) => void;
    replaceCurrent: (searchText: string, replacement: string) => void;
    searchNext: (searchText: string) => void;
    sortSelection: () => void;
    toggleFormattingMarks: () => void;
  };
}

const RibbonRuntimeContext = createContext<CommandRegistry<RibbonCommandContext> | null>(null);

export const RibbonRuntimeProvider = ({
  children,
  registry,
}: {
  children: ReactNode;
  registry: CommandRegistry<RibbonCommandContext>;
}) => (
  <RibbonRuntimeContext.Provider value={registry}>
    {children}
  </RibbonRuntimeContext.Provider>
);

// El hook y el proveedor deben compartir exactamente la misma instancia de contexto.
// eslint-disable-next-line react-refresh/only-export-components
export const useRibbonCommandRegistry = () => {
  const registry = useContext(RibbonRuntimeContext);
  if (!registry) throw new Error('La cinta requiere RibbonRuntimeProvider.');
  return registry;
};

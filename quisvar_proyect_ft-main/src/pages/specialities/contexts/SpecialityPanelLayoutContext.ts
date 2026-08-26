import { createContext, useContext } from 'react';

interface SpecialityPanelLayoutContextValue {
  sidebarPanelVisible: boolean;
  setSidebarPanelVisible: (visible: boolean) => void;
}

export const SpecialityPanelLayoutContext =
  createContext<SpecialityPanelLayoutContextValue>({
    sidebarPanelVisible: true,
    setSidebarPanelVisible: () => undefined,
  });

export const useSpecialityPanelLayout = () =>
  useContext(SpecialityPanelLayoutContext);

import { createContext, useContext, useEffect } from 'react';

export type SystemHeaderAction = {
  label?: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

type SystemHeaderActionContextValue = {
  setHeaderAction: (action: SystemHeaderAction | null) => void;
};

export const SystemHeaderActionContext =
  createContext<SystemHeaderActionContextValue | null>(null);

export const useSystemHeaderAction = (action: SystemHeaderAction | null) => {
  const context = useContext(SystemHeaderActionContext);

  useEffect(() => {
    if (!context) return;

    context.setHeaderAction(action);

    return () => {
      context.setHeaderAction(null);
    };
  }, [action, context]);
};

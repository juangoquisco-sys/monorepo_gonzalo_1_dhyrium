import {
  createContext,
  useRef,
  type ReactNode,
  type MutableRefObject,
  type KeyboardEvent,
} from 'react';

interface InputsContextType {
  inputRefs: MutableRefObject<HTMLInputElement[][]>;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onInputFocusRef: (event: HTMLInputElement) => void;
  getNewNumRowTask: () => number;
}

export const InputFocusContext = createContext<InputsContextType | undefined>(
  undefined
);

interface InputFocusProviderProps {
  children: ReactNode;
  colNumber: number;
  className?: string;
}

export const InputFocusProvider = ({
  children,
  colNumber = 0,
  className,
}: InputFocusProviderProps) => {
  const inputRefs = useRef<HTMLInputElement[][]>(
    Array.from({ length: colNumber }, () => [])
  );

  const numRowTask = useRef(0);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const colNumber = Number(target.dataset.col ?? 0);
    const rowNumber = Number(target.dataset.row ?? 0);
    if (!Number.isInteger(colNumber) || !Number.isInteger(rowNumber)) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      inputRefs.current[colNumber][rowNumber + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      inputRefs.current[colNumber][rowNumber - 1]?.focus();
    }
  };

  const getNewNumRowTask = () => {
    numRowTask.current += 1;
    return numRowTask.current;
  };

  const onInputFocusRef = (event: HTMLInputElement) => {
    const colNumber = Number(event?.dataset?.col ?? 0);
    const rowNumber = Number(event?.dataset?.row ?? 0);
    if (!Number.isInteger(colNumber) || !Number.isInteger(rowNumber)) return;
    inputRefs.current[colNumber][rowNumber] = event;
  };
  return (
    <InputFocusContext.Provider
      value={{ inputRefs, handleKeyDown, onInputFocusRef, getNewNumRowTask }}
    >
      {className ? <div className={className}>{children}</div> : children}
    </InputFocusContext.Provider>
  );
};

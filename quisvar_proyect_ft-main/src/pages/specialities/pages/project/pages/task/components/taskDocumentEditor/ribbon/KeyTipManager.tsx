import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

type KeyTipScope = 'tabs' | 'commands';

interface KeyTipManagerValue {
  active: boolean;
  scope: KeyTipScope;
  register: (keyTip: string, element: HTMLElement, scope: KeyTipScope) => () => void;
  hide: () => void;
}

const KeyTipContext = createContext<KeyTipManagerValue | null>(null);

export const KeyTipManager = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState(false);
  const [scope, setScope] = useState<KeyTipScope>('tabs');
  const registrations = useRef(new Map<string, HTMLElement>());
  const previousFocus = useRef<HTMLElement | null>(null);
  const sequence = useRef('');
  const altPending = useRef(false);

  const hide = useCallback(() => {
    setActive(false);
    setScope('tabs');
    sequence.current = '';
  }, []);

  const register = useCallback((keyTip: string, element: HTMLElement, keyTipScope: KeyTipScope) => {
    const normalized = keyTip.toLocaleUpperCase('es-PE');
    const registrationKey = `${keyTipScope}:${normalized}`;
    registrations.current.set(registrationKey, element);
    return () => {
      if (registrations.current.get(registrationKey) === element) registrations.current.delete(registrationKey);
    };
  }, []);

  useEffect(() => {
    const toggleKeyTips = () => {
      if (active) {
        hide();
        previousFocus.current?.focus();
        return;
      }
      previousFocus.current = document.activeElement as HTMLElement | null;
      sequence.current = '';
      setScope('tabs');
      setActive(true);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        altPending.current = true;
        event.preventDefault();
        return;
      }
      if (altPending.current) {
        // Cualquier tecla pulsada mientras Alt sigue pendiente convierte el gesto en
        // un atajo (por ejemplo Alt+Flecha abajo), no en una activación de KeyTips.
        altPending.current = false;
      }
      if (event.key === 'F10') {
        event.preventDefault();
        toggleKeyTips();
        return;
      }
      if (!active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (scope === 'commands') {
          sequence.current = '';
          setScope('tabs');
          document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
          return;
        }
        hide();
        previousFocus.current?.focus();
        return;
      }
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      sequence.current += event.key.toLocaleUpperCase('es-PE');
      const registrationPrefix = `${scope}:`;
      const exact = registrations.current.get(`${registrationPrefix}${sequence.current}`);
      if (exact) {
        exact.focus();
        exact.click();
        if (scope === 'tabs') {
          sequence.current = '';
          setScope('commands');
        } else {
          hide();
        }
        return;
      }
      if (![...registrations.current.keys()].some(key => key.startsWith(`${registrationPrefix}${sequence.current}`))) {
        sequence.current = '';
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' || !altPending.current) return;
      altPending.current = false;
      event.preventDefault();
      toggleKeyTips();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [active, hide, scope]);

  const value = useMemo(() => ({ active, scope, register, hide }), [active, hide, register, scope]);
  return <KeyTipContext.Provider value={value}>{children}</KeyTipContext.Provider>;
};

// El hook comparte el contexto privado del proveedor y forma una única unidad de cinta.
// eslint-disable-next-line react-refresh/only-export-components
export const useKeyTip = (
  keyTip: string | undefined,
  ref: RefObject<HTMLElement | null>,
  scope: KeyTipScope = 'commands'
) => {
  const manager = useContext(KeyTipContext);
  useEffect(() => {
    if (!keyTip || !ref.current || !manager) return;
    return manager.register(keyTip, ref.current, scope);
  }, [keyTip, manager, ref, scope]);
  return Boolean(manager?.active && manager.scope === scope);
};

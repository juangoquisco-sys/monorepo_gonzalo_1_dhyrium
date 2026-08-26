import { useState, useEffect } from 'react';

const useLocalStorage = (key: string): string | null => {
  const [value, setValue] = useState<string | null>(() =>
    localStorage.getItem(key)
  );

  useEffect(() => {
    const synchronizeValue = () => {
      const currentValue = localStorage.getItem(key);
      setValue(previousValue =>
        previousValue === currentValue ? previousValue : currentValue
      );
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === key) synchronizeValue();
    };

    window.addEventListener('storage', handleStorageChange);
    // El evento `storage` solo se emite en otras pestañas. Este sondeo corto
    // mantiene la pestaña actual sincronizada sin reemplazar globalmente
    // localStorage.setItem ni provocar setState durante el render de terceros.
    const localSynchronization = window.setInterval(synchronizeValue, 250);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(localSynchronization);
    };
  }, [key]);

  return value;
};

export default useLocalStorage;

import { useEffect, useState } from 'react';

const useHideElement = (size: number) => {
  const [hideElements, setHideElements] = useState(
    () => window.innerWidth <= size
  );

  const handleHideElements = () => {
    setHideElements(prev => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      setHideElements(window.innerWidth < size);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { hideElements, handleHideElements };
};

export default useHideElement;

import { useEffect } from 'react';
import { loader$ } from '@/services/sharingSubject';

const RouteLazyFallback = () => {
  useEffect(() => {
    loader$.setSubject = true;

    return () => {
      loader$.setSubject = false;
    };
  }, []);

  return null;
};

export default RouteLazyFallback;

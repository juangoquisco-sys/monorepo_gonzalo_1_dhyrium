import { useEffect, useRef, useState } from 'react';
import './loader.css';
import { loader$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';

const LOGOS = {
  default: 'img/dhyrium_logo.svg',
  christmas: 'img/Christmas-dhyrium_2.png',
};
const Loader = () => {
  const [isLoader, setIsLoader] = useState<boolean>(false);

  const handleLoaderRef = useRef<Subscription>(new Subscription());
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    handleLoaderRef.current = loader$.getSubject.subscribe((value: boolean) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (value) {
        setIsLoader(true);
        return;
      }

      hideTimeoutRef.current = setTimeout(() => {
        setIsLoader(false);
        hideTimeoutRef.current = null;
      }, 150);
    });

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      handleLoaderRef.current.unsubscribe();
    };
  }, []);

  return (
    <>
      {isLoader && (
        <div className="loading">
          <figure className="loader-v2">
            <img src={LOGOS.default} alt="" />
          </figure>
          {/* <span className="loader">bota tu ga</span> */}
        </div>
      )}
    </>
  );
};

export default Loader;

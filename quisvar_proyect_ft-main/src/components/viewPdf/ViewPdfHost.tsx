import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Subscription } from 'rxjs';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import type { ViewPdf as ViewPdfValue } from '@/services/types';

interface ViewPdfProps {
  initialValue?: ViewPdfValue;
  onReady?: () => void;
}

type ViewPdfComponent = ComponentType<ViewPdfProps>;

const ViewPdfHost = () => {
  const [initialValue, setInitialValue] = useState<ViewPdfValue | null>(null);
  const [ViewPdf, setViewPdf] = useState<ViewPdfComponent | null>(null);
  const subscriptionRef = useRef<Subscription>(new Subscription());
  const viewerReadyRef = useRef(false);
  const viewerImportRef = useRef<Promise<{ default: ViewPdfComponent }> | null>(
    null
  );

  useEffect(() => {
    subscriptionRef.current = isOpenViewPdf$.getSubject.subscribe(value => {
      if (!value.isOpen || viewerReadyRef.current) return;

      setInitialValue(value);
      viewerImportRef.current ??= import('./ViewPdf');
      void viewerImportRef.current.then(({ default: ViewPdf }) => {
        setViewPdf(() => ViewPdf);
      });
    });

    return () => {
      subscriptionRef.current.unsubscribe();
    };
  }, []);

  if (!ViewPdf) return null;

  return (
    <ViewPdf
      initialValue={initialValue ?? undefined}
      onReady={() => {
        viewerReadyRef.current = true;
      }}
    />
  );
};

export default ViewPdfHost;

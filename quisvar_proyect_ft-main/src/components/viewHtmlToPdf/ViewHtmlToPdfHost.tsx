import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Subscription } from 'rxjs';
import { isOpenViewHtmlToPdf$ } from '@/services/sharingSubject';
import type { ViewHtmlToPdf as ViewHtmlToPdfValue } from '@/services/types';

interface ViewHtmlToPdfProps {
  initialValue?: ViewHtmlToPdfValue;
  onReady?: () => void;
}

type ViewHtmlToPdfComponent = ComponentType<ViewHtmlToPdfProps>;

const ViewHtmlToPdfHost = () => {
  const [initialValue, setInitialValue] = useState<ViewHtmlToPdfValue | null>(
    null
  );
  const [ViewHtmlToPdf, setViewHtmlToPdf] =
    useState<ViewHtmlToPdfComponent | null>(null);
  const subscriptionRef = useRef<Subscription>(new Subscription());
  const viewerReadyRef = useRef(false);
  const viewerImportRef = useRef<Promise<{
    default: ViewHtmlToPdfComponent;
  }> | null>(null);

  useEffect(() => {
    subscriptionRef.current = isOpenViewHtmlToPdf$.getSubject.subscribe(
      value => {
        if (!value.isOpen || viewerReadyRef.current) return;

        setInitialValue(value);
        viewerImportRef.current ??= import('./ViewHtmlToPdf');
        void viewerImportRef.current.then(({ default: ViewHtmlToPdf }) => {
          setViewHtmlToPdf(() => ViewHtmlToPdf);
        });
      }
    );

    return () => {
      subscriptionRef.current.unsubscribe();
    };
  }, []);

  if (!ViewHtmlToPdf) return null;

  return (
    <ViewHtmlToPdf
      initialValue={initialValue ?? undefined}
      onReady={() => {
        viewerReadyRef.current = true;
      }}
    />
  );
};

export default ViewHtmlToPdfHost;

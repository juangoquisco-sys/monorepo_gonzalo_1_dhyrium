import { useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import SubjectManager from '@/models/subjectManager';
import type { OpenModal } from '@/services/types';

// interface CallbackSubscription extends T {
//   isOpen: boolean;
// }

const useModalSubscription = <T extends OpenModal>(
  observable$: SubjectManager<T>,
  callback?: (value: T) => void
) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const modalRef = useRef<Subscription>(new Subscription());

  const onCloseModal = () => {
    setIsOpenModal(false);
  };

  const onOpenModal = () => {
    setIsOpenModal(true);
  };

  useEffect(() => {
    modalRef.current = observable$.getSubject.subscribe(data => {
      setIsOpenModal(data.isOpen);
      callback?.(data);
    });

    return () => {
      modalRef.current.unsubscribe();
    };
  }, [observable$, callback]);
  return {
    onCloseModal,
    isOpenModal,
    modalRef,
    onOpenModal,
  };
};

export default useModalSubscription;

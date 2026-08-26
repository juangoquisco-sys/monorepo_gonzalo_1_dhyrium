import { motion } from 'framer-motion';
import './modal.css';
import { isOpenModal$ } from '@/services/sharingSubject';
import { useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { dropIn } from '@/animations/animations';
import Portal from './Portal';

interface ModalProps {
  children: React.ReactNode;
  size?: number;
  sizeHeight?: number;
  isOpenProp?: boolean;
  contentClassName?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}
const Modal = ({
  children,
  size,
  isOpenProp,
  sizeHeight,
  contentClassName = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenModal$.getSubject.subscribe(value =>
      setIsOpen(value)
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  if (isOpenProp !== undefined) {
    if (!isOpenProp) return null;
  } else {
    if (!isOpen) return null;
  }
  return (
    <Portal wrapperId="modal">
      <motion.div
        // onClick={() => setIsOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className="modal-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { delay: 2 } }}
      >
        <motion.div
          className={`modal-children ${contentClassName}`}
          onClick={e => e.stopPropagation()}
          variants={dropIn}
          initial="hidden"
          animate="visible"
          exit="leave"
          style={{
            minWidth: `${size ? size : 100}%`,
            ...(sizeHeight ? { height: `${sizeHeight}%` } : {}),
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </Portal>
  );
};

export default Modal;

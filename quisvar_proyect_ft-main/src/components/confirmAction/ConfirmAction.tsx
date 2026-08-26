import Button from '../button/Button';
import CloseIcon from '../closeIcon/CloseIcon';
import Modal from '../portal/Modal';
import { useEffect, useRef, useState } from 'react';
import { isOpenConfirmAction$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';

const ConfirmAction = () => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [customFuction, setCustomFuction] = useState<(() => void) | null>(null);
  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenConfirmAction$.getSubject.subscribe(value => {
      setIsAlertOpen(value.isOpen);
      setCustomFuction(value.function);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  const handleConfirm = () => {
    customFuction?.();
    setIsAlertOpen(false);
  };
  return (
    <Modal size={50} isOpenProp={isAlertOpen}>
      <div className="alert-modal-children">
        <CloseIcon onClick={() => setIsAlertOpen(false)} />
        <img src="/svg/folder-icon.svg" className="alert-modal-trash" />
        <h3>¿Estas seguro que desea archivar este trámite?</h3>
        <div className="container-btn">
          <Button
            text="Cancelar"
            onClick={() => setIsAlertOpen(false)}
            className="modal-btn-cancel"
            variant="outline"
          />
          {customFuction && (
            <Button
              text="Confirmar"
              onClick={handleConfirm}
              className="modal-btn-confirm"
              variant="outline"
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmAction;

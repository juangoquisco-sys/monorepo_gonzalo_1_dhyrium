import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { axiosInstance } from '@/services/axiosInstance';
import './button.css';
import { type CSSProperties, useMemo, useState } from 'react';
import Button from './Button';
import { dropIn } from '@/animations/animations';
import Portal from '../portal/Portal';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import InputText from '../Input/Input';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import CloseIcon from '../closeIcon/CloseIcon';
import useModalSubscription from '@/hooks/useModalSubscription';
import type { OpenConfirmAction } from '@/services/types';
interface ButtonProps extends HTMLMotionProps<'button'> {
  text?: string;
  type?: 'button' | 'submit' | 'reset';
  url?: string;
  icon?: string;
  onSave?: () => void;
  customOnClick?: () => void;
  notIsVisible?: boolean;
  imageStyle?: string;
  fileName?: string;
  passwordRequired?: boolean;
  style?: CSSProperties;
}

const CONFIRM_VARIANT = {
  danger: {
    icon: '/svg/trashdark.svg',
    confirmColor: 'danger' as const,
  },
  warning: {
    icon: '/svg/folder-icon.svg',
    confirmColor: 'primary' as const,
  },
  info: {
    icon: '/svg/folder-icon.svg',
    confirmColor: 'secondary' as const,
  },
};

const ButtonDelete = ({
  notIsVisible = false,
  className,
  text,
  type,
  url,
  fileName = '',
  icon,
  onSave,
  imageStyle = '',
  customOnClick,
  passwordRequired,
  style,
  ...otherProps
}: ButtonProps) => {
  const [confirmConfig, setConfirmConfig] = useState<OpenConfirmAction | null>(
    null
  );
  const [askPassword, setAskPassword] = useState<boolean>(false);
  const [customFuction, setCustomFuction] = useState<(() => unknown) | null>(
    null
  );
  const [password, setPassword] = useState<string>('');
  const { onCloseModal, isOpenModal, onOpenModal } = useModalSubscription(
    isOpenButtonDelete$,
    value => {
      setCustomFuction(() => value.function);
      setConfirmConfig(value);
    }
  );

  const modalVariant = confirmConfig?.variant || 'danger';
  const modalUi = CONFIRM_VARIANT[modalVariant];

  const modalTitle = useMemo(() => {
    if (confirmConfig?.title) return confirmConfig.title;
    if (confirmConfig?.alertText) return confirmConfig.alertText;

    return `¿Estas seguro que deseas eliminar este registro${
      fileName && ', ' + fileName
    }?`;
  }, [confirmConfig?.title, confirmConfig?.alertText, fileName]);

  const modalDescription = confirmConfig?.description || null;
  const confirmText = confirmConfig?.confirmText || 'Si, estoy seguro';
  const cancelText = confirmConfig?.cancelText || 'No, cancelar';

  const handleCloseButton = () => {
    setAskPassword(false);
    setPassword('');
    setConfirmConfig(null);
    onCloseModal();
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAskPassword(false);
    setConfirmConfig(null);
    onOpenModal();
  };
  const handleSendDelete = async () => {
    if (customOnClick) {
      customOnClick();
      onCloseModal();

      return;
    }
    if (customFuction) {
      customFuction();
      onCloseModal();

      return;
    }
    await axiosInstance.delete(`${url}`).then(() => {
      onSave?.();
      onCloseModal();
    });
  };
  const { dni } = useSelector((state: RootState) => state.userSession.profile);
  const handleVerifyPassword = () => {
    const data = {
      dni,
      password: password,
    };
    axiosInstance
      .post('/auth/login', data)
      .then(() => {
        handleSendDelete();
      })
      .catch(err => console.log(err));
  };

  // const handleIsOpen = useRef<Subscription>(new Subscription());

  // useEffect(() => {
  //   handleIsOpen.current = isOpenButtonDelete$.getSubject.subscribe(value => {
  //     setIsAlertOpen(value.isOpen);
  //     setCustomFuction(() => value.function);
  //   });
  //   return () => {
  //     handleIsOpen.current.unsubscribe();
  //   };
  // }, []);

  return (
    <>
      <motion.button
        onClick={handleDelete}
        className={`${className} btn-main  btn-delete ${
          notIsVisible && 'btn-hiden'
        }`}
        style={style}
        type={type}
        {...otherProps}
      >
        {icon && (
          <img
            src={`/svg/${icon}.svg`}
            alt={`${icon}`}
            className={`${
              text ? 'btn-main-text' : 'btn-main-img'
            } ${imageStyle} `}
          />
        )}
        {text}
      </motion.button>

      {isOpenModal && (
        <Portal wrapperId="modal">
          <div
            className="alert-modal-main"
            role="dialog"
            onClick={handleCloseButton}
          >
            <motion.div
              className="alert-modal-children"
              variants={dropIn}
              onClick={e => e.stopPropagation()}
              initial="hidden"
              animate="visible"
              exit="leave"
            >
              <CloseIcon onClick={handleCloseButton} />
              {!askPassword ? (
                <>
                  <img src={modalUi.icon} className="alert-modal-trash" />
                  <div className="alert-modal-copy">
                    <h3>{modalTitle}</h3>
                    {modalDescription && <p>{modalDescription}</p>}
                  </div>
                  <div className="container-btn">
                    <Button
                      text={cancelText}
                      onClick={handleCloseButton}
                      color="secondary"
                      variant="outline"
                    />
                    <Button
                      text={confirmText}
                      color={modalUi.confirmColor}
                      type="button"
                      variant="outline"
                      onClick={
                        passwordRequired
                          ? () => setAskPassword(true)
                          : handleSendDelete
                      }
                    />
                  </div>
                </>
              ) : (
                <form className="delete-form-btn">
                  <img src="/svg/trashdark.svg" className="alert-modal-trash" />
                  <div className="modal-text-input">
                    <InputText
                      label="Ingrese su contraseña"
                      autoComplete="no"
                      placeholder="Contraseña"
                      onChange={e => setPassword(e.target.value)}
                      type="password"
                    />
                  </div>
                  <div className="container-btn">
                    <Button
                      type="button"
                      text="Cancelar"
                      onClick={handleCloseButton}
                      className="modal-btn-cancel"
                      variant="outline"
                    />
                    <Button
                      text="Confirmar"
                      onClick={handleVerifyPassword}
                      className="modal-btn-confirm"
                      variant="outline"
                    />
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </Portal>
      )}
    </>
  );
};

export default ButtonDelete;

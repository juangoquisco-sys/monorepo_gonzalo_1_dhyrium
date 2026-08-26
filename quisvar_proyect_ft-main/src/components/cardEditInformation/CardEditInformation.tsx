import { useDispatch, useSelector } from 'react-redux';
import './cardEditInformation.css';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppDispatch, RootState } from '@/store/store.types';
import { type MouseEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { User } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import Button from '../button/Button';
import Input from '../Input/Input';
import CardRecoveryPassword from './CardRecoveryPassword';
import { getUserSession } from '@/store/slices/userSession.slice';
import CardResizing from '../resizing/CardResizing';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface CardEditInformationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const CardEditInformation = ({ isOpen, onClose }: CardEditInformationProps) => {
  const dispatch: AppDispatch = useDispatch();
  const [isOpenRecovery, setIsOpenRecovery] = useState(false);
  const [viewSign, setViewSign] = useState(false);
  const [viewDetailsSign, setViewSignDetailsSign] = useState(false);
  const [sign, setSign] = useState<string | null>(null);
  const userSession = useSelector((state: RootState) => state.userSession);
  const { register, handleSubmit, reset } = useForm<User>();

  useEffect(() => {
    if (userSession) {
      reset(userSession);
    }
  }, [reset, userSession]);

  const onSubmit = async (values: User) => {
    if (userSession?.id !== undefined) {
      const { firstName, lastName, phone, dni, description } = values.profile;
      const saveData = {
        firstName,
        lastName,
        phone,
        dni,
        description,
      };
      axiosInstance
        .put(`/profile/${userSession?.id}`, saveData)
        .then(() => dispatch(getUserSession()));
    }
  };

  const handleActionFinished = () => {
    setViewSign(false);
    setSign(null);
    setViewSignDetailsSign(false);
  };

  const handleCloseModal = () => {
    handleActionFinished();
    onClose?.();
  };
  const handleGetSign = () => {
    const token: string | null = localStorage.getItem('token');
    const url = 'encrypt/' + userSession.profile.dni + `?token=${token}`;
    axiosInstance
      .get(url)
      .then(({ config }) => {
        setSign(`${config.baseURL}/${config.url}`);
      })
      .catch(() => setSign(null));
  };

  const handleGetSignInformation = () => {
    setViewSignDetailsSign(true);
    handleGetSign();
  };
  const handleOpenRecovery = () => setIsOpenRecovery(true);
  const handleCloseRecovery = () => setIsOpenRecovery(false);
  const handleViewSign = () => {
    if (!viewSign) handleGetSign();
    setViewSign(!viewSign);
  };

  const handleContextMenuImg = (event: MouseEvent<HTMLImageElement>) =>
    event.preventDefault();

  const handleRemoveSign = () => {
    axiosInstance.delete('encrypt').then(({ data }) => {
      handleActionFinished();
      SnackbarUtilities.success(data.message);
    });
  };

  // const convertBase64ToBlob = (string64: string) => {
  //   // const blob = await fetch(string64).then(res => res.blob());
  //   console.log(string64.split(','));
  //   const binaryData = atob(string64.split(',')[0]);
  //   const blob = new Blob([binaryData], { type: 'image/png' });
  //   const url = URL.createObjectURL(blob);
  //   return url;
  // };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '+100%' }}
          animate={{ x: 0 }}
          exit={{ x: '+100%' }}
          transition={{ duration: 1 }}
          className="modal-edit-info"
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <Button
              onClick={handleCloseModal}
              icon="close"
              className="controls-btn card-edit-btn-close-modal"
              iconSize={1.3}
              variant="ghost"
              type="button"
            />
            <div className="card-edit-header-info">
              <h1>INFORMACIÓN BÁSICA</h1>
            </div>
            <div className="divider"></div>
            <section className="inputs-section">
              <Input {...register('profile.firstName')} label="Nombres" />
              <Input {...register('profile.lastName')} label="Apellidos" />
              <Input {...register('profile.phone')} label="Celular" />
              <Input {...register('profile.description')} label="Cargo" />
              <Input {...register('profile.dni')} label="DNI" disabled />
              <Input {...register('email')} label="Correo" disabled />
            </section>
            <hr className="divider" />
            <section className="card-edit-resizing-img">
              <div className="card-edit-sign-container-header">
                <span className="card-edit-sign-container-title">
                  Firma Digital
                </span>
                {!sign && (
                  <Button
                    type="button"
                    text="Consultar Estado"
                    className="controls-btn"
                    onClick={handleGetSignInformation}
                    variant="outline"
                  />
                )}
              </div>
              {viewDetailsSign && (
                <>
                  {sign ? (
                    <div className="card-edit-sign-container">
                      <div className="card-edit-sign-controls">
                        <Button
                          type="button"
                          text={viewSign ? 'CERRAR' : 'DESENCRIPTAR Y VER'}
                          className="controls-btn"
                          onClick={handleViewSign}
                          variant="outline"
                        />
                        <Button
                          type="button"
                          text="ELIMINAR"
                          onClick={handleRemoveSign}
                          variant="outline"
                          className="controls-btn controls-btn-red"
                        />
                      </div>
                      {viewSign && (
                        <figure className="card-edit-sign-image-container">
                          <img
                            src={sign}
                            alt="sign"
                            onContextMenu={handleContextMenuImg}
                          />
                        </figure>
                      )}
                    </div>
                  ) : (
                    <CardResizing onSave={handleActionFinished} />
                  )}
                </>
              )}
            </section>
            <hr className="divider" />
            <div className="col-btns">
              <Button
                text="Cambiar contraseña"
                onClick={handleOpenRecovery}
                type="button"
              />
              <Button text="GUARDAR" className="bg-inverse" type="submit" />
            </div>
          </form>
          {isOpenRecovery && (
            <CardRecoveryPassword onClose={handleCloseRecovery} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardEditInformation;

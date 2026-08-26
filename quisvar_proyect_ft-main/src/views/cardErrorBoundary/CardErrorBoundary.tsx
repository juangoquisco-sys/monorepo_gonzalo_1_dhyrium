import { FaCircleExclamation, FaWhatsapp, FaArrowLeft } from 'react-icons/fa6';
import { QRCodeCanvas } from 'qrcode.react';
import { COLOR_CSS } from '@/utils/cssData';
import Button from '@/components/button/Button';
import './cardErrorBoundary.css';
import { useNavigate } from 'react-router-dom';
const phoneNumber = '51930665986';
const message =
  'Hola, tuve un problema en la página web y quisiera reportarlo. ¡Gracias!';
const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
  message
)}`;
const CardErrorBoundary = () => {
  const navigate = useNavigate();

  const onBack = () => {
    navigate(-1);
  };
  const onRetry = () => {
    window.location.reload();
  };
  const openWhatsApp = () => {
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="error-container">
      <div className="card-error">
        <FaCircleExclamation color={COLOR_CSS.danger} size={50} />
        <p className="card-error-title">¡Ups! Algo salió mal</p>
        <div>
          <p className="card-error-message">
            Hubo un problema al procesar la consulta. Porfavor intente de nuevo.
          </p>
          <p className="card-error-message">
            Para reportar un error, escanea el código QR
          </p>
          <div className="card-error-message">
            <QRCodeCanvas
              value={whatsappLink}
              size={150}
              includeMargin={true}
            />
          </div>
          <p className="card-error-message">ó</p>
          <p className="card-error-message">
            <span className="card-error-message-click" onClick={openWhatsApp}>
              <FaWhatsapp className="icon-adjust" /> click aquí.
            </span>{' '}
          </p>
        </div>
        <Button
          text="Recargar la página"
          onClick={onRetry}
        />
        <Button
          text="Retornar a la última página"
          leftIcon={<FaArrowLeft size={15} />}
          onClick={onBack}
        />
      </div>
    </div>
  );
};

export default CardErrorBoundary;

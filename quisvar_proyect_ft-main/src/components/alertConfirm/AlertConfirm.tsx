import { useState } from 'react';
import Button from '../button/Button';
import CloseIcon from '../closeIcon/CloseIcon';
import Modal from '../portal/Modal';
import useModalSubscription from '@/hooks/useModalSubscription';
import { isOpenAlertConfirm$ } from '@/services/sharingSubject';
import type { OpenAlertConfirm } from '@/services/types';
import './alertConfirm.css';

const ALERT_VARIANT = {
  danger: {
    icon: '/svg/trashdark.svg',
    badge: 'Accion delicada',
  },
  warning: {
    icon: '/svg/folder-icon.svg',
    badge: 'Confirmacion',
  },
  info: {
    icon: '/svg/folder-icon.svg',
    badge: 'Revision',
  },
};

const AlertConfirm = () => {
  const [config, setConfig] = useState<OpenAlertConfirm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpenModal, onCloseModal } = useModalSubscription(
    isOpenAlertConfirm$,
    value => {
      setConfig(value);
      setIsSubmitting(false);
    }
  );

  const handleClose = () => {
    if (isSubmitting) return;
    setConfig(null);
    onCloseModal();
  };

  const handleConfirm = async () => {
    if (!config?.onConfirm || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await Promise.resolve(config.onConfirm());
      setIsSubmitting(false);
      setConfig(null);
      onCloseModal();
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  if (!isOpenModal || !config) return null;

  const variant = config.variant || 'warning';
  const variantUi = ALERT_VARIANT[variant];

  return (
    <Modal size={34} isOpenProp={isOpenModal}>
      <div className={`alertConfirm alertConfirm--${variant}`}>
        <CloseIcon
          onClick={handleClose}
          size={0.72}
          right={0.8}
          top={0.8}
          zIndex={1}
        />

        <div className="alertConfirm-header">
          <img src={variantUi.icon} alt={variantUi.badge} />
          <span className="alertConfirm-badge">{variantUi.badge}</span>
        </div>

        <div className="alertConfirm-copy">
          <h3>{config.title}</h3>
          {config.description && <p>{config.description}</p>}
        </div>

        {!!config.summaryItems?.length && (
          <div className="alertConfirm-summary">
            {config.summaryItems.map(item => (
              <article
                key={`${item.label}-${item.value}`}
                className="alertConfirm-summaryItem"
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        )}

        {config.warningText && (
          <div className="alertConfirm-warning">
            <strong>Importante</strong>
            <p>{config.warningText}</p>
          </div>
        )}

        <div className="alertConfirm-actions">
          <Button
            text={config.cancelText || 'Cancelar'}
            onClick={handleClose}
            color="secondary"
            variant="outline"
            disabled={isSubmitting}
          />
          <Button
            text={
              isSubmitting ? 'Guardando...' : config.confirmText || 'Confirmar'
            }
            color={variant === 'danger' ? 'danger' : 'primary'}
            variant="outline"
            onClick={handleConfirm}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
};

export default AlertConfirm;

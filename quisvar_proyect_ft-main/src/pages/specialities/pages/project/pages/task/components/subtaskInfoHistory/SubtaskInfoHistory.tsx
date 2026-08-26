import { useEffect, useState } from 'react';
import type { DataFeedback, Feedback, Profile } from '@/types/types';
import { motion } from 'framer-motion';
import TextArea from '@/components/textArea/TextArea';
import './subtaskInfoHistory.css';
import { container } from '../../../../../../../../animations/animations';
import { _date } from '@/utils/formatDate';
import SubtaskFile from '../subtaskFiles/SubtaskFile';
interface SubtaskInfoHistoryProps {
  feedBack: Feedback;
  className?: string;
  getDataFeedback?: (data: DataFeedback) => void;
  authorize?: {
    isAuthorizedMod: boolean;
    isAuthorizedUser: boolean;
  };
  active?: boolean;
  viewComentary?: boolean;
}

const SubtaskInfoHistory = ({
  feedBack,
  className,
  authorize,
  getDataFeedback,
  active = false,
  viewComentary = false,
}: SubtaskInfoHistoryProps) => {
  const [isActive, setIsActive] = useState(false);
  const toggleIsActive = () => setIsActive(!isActive);

  const getUserName = (profile: Profile) => {
    const { firstName, lastName } = profile;
    return firstName + ' ' + lastName;
  };
  useEffect(() => {
    setIsActive(active);
  }, [active]);

  const getDatetimeCreated = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    const localeDate = _date(date);
    const localeTime = date.toLocaleTimeString();

    return ` ${localeDate} a las ${localeTime}`;
  };
  return (
    <div className={`SubtaskInfoHistory-review-card ${className}`}>
      <h3
        className="SubtaskInfoHistory-title-information"
        onClick={toggleIsActive}
      >
        <figure className="cardSubtask-figure">
          <img src="/svg/person-blue.svg" alt="W3Schools" />
        </figure>
        {getUserName(feedBack.users[0].user.profile)}
        <span className="SubtaskInfoHistory-send-file">
          Envió entregable al{' '}
          <span className="SubtaskInfoHistory-span-percentage">
            {feedBack.percentage}%
          </span>
        </span>
        <span className="SubtaskInfoHistory-send-date">
          {getDatetimeCreated(feedBack.createdAt)}
        </span>
      </h3>
      {isActive && (
        <motion.div
          className="SubtaskInfoHistory-container-feedback"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div
            className={`${
              !getDataFeedback
                ? 'SubtaskInfoHistory-container-feedback-files-container'
                : 'SubtaskInfoHistory-no-feedback '
            }`}
          >
            <SubtaskFile files={feedBack.files} showDeleteBtn={false} />
          </div>
          {feedBack.users[1] && (
            <h3 className="SubtaskInfoHistory-title-information">
              <span className="SubtaskInfoHistory-send-file">
                <span
                  className="SubtaskInfoHistory-span-status"
                  style={{ color: feedBack.status ? '#14804a' : '#d12953' }}
                >
                  {feedBack.status ? 'Aprobado ' : 'Rechazado '}
                </span>
                por {getUserName(feedBack.users[1].user.profile)}
              </span>
              <span className="SubtaskInfoHistory-send-date">
                {getDatetimeCreated(feedBack.users[1].assignedAt)}
              </span>
            </h3>
          )}
          {getDataFeedback &&
            ((authorize?.isAuthorizedUser && feedBack.comment) ||
              authorize?.isAuthorizedMod) && (
              <TextArea
                rows={2}
                className="SubtaskInfoHistory-container-feedback-textarea"
                onBlur={e =>
                  getDataFeedback({
                    comment: e.target.value.trim(),
                    id: feedBack.id,
                  })
                }
                placeholder={
                  !feedBack.comment ? 'Añadir Comentario' : 'Comentario'
                }
                defaultValue={feedBack.comment || ''}
                disabled={!!feedBack.comment}
              />
            )}

          {viewComentary && feedBack.comment && <div>{feedBack.comment}</div>}
        </motion.div>
      )}
    </div>
  );
};

export default SubtaskInfoHistory;

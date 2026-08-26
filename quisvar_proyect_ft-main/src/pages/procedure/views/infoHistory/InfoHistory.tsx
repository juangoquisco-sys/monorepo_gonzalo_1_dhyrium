import { useState } from 'react';
// import { IconAction } from '../../../../components';
import './infoHistory.css';
import type { MessageReply } from '@/types/types';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
// import { ChipFileMessage } from '../../pages/paymentProcessing/components';
// import { normalizeFileName } from '../../../../utils';
import { URL } from '@/services/axiosInstance';
// import { ChipFileMessage } from '../../pages/paymentProcessing/components';
// import { normalizeFileName } from '../../../../utils';
interface InfoHistoryProps {
  history: MessageReply;
}
const InfoHistory = ({ history }: InfoHistoryProps) => {
  const [isShow, setIsShow] = useState(false);
  const [currentId, setCurrentId] = useState<number>();
  const { office, subtitle, status } = JSON.parse(history.description);
  const normalizeImg = () => {
    if (office && office.includes('MESA')) {
      return 'fluent';
    } else if (office && office.includes('GERENCIA')) {
      return 'BuildingOffice';
    } else {
      return 'sheet';
    }
  };
  return (
    <div className="infoHistory-content">
      <div className="infoHistory-container">
        <span>
          <img src={`/svg/history/send.svg`} />
        </span>
        <div className="infoHistory-info">
          <div className="infoHistory-date">
            {formatDayDateTimeUtc(history.createdAt)}
          </div>
          <div className="infoHistory-main">
            <label className="infoHistory-title">
              <div className="if-icon">
                <img src={`/svg/history/${normalizeImg()}.svg`} />
              </div>
              {office}
            </label>
            {!!history.files?.length && (
              <span
                onClick={() => {
                  setIsShow(!isShow);
                  setCurrentId(history.id);
                }}
                className="infoHistory-btn"
              >
                <img
                  src={`/svg/${
                    isShow ? 'eye-primary-close' : 'eye-primary'
                  }.svg`}
                  width={'16px'}
                  height={'16px'}
                />
                <h4>{isShow ? 'Ocultar' : 'Ver'}</h4>
              </span>
            )}
          </div>
          <div
            className={`infoHistory-subtitle ${
              subtitle.toLowerCase().includes('derivado')
                ? 'ih-derived'
                : status
                ? 'ih-aproved'
                : 'ih-rejected'
            }`}
          >
            {subtitle}
          </div>
        </div>
      </div>
      {isShow &&
        currentId === history.id &&
        history.files &&
        history.files
          .filter(({ name }) => name.toLowerCase().includes('pdf'))
          .map(({ id, name, path }) => (
            <object
              data={`${URL}/${path.replace('public', 'file-user')}/${name}`}
              type="application/pdf"
              style={{ width: '100%', aspectRatio: 0.75, height: '34.375rem' }}
              key={id}
            />
          ))}
      {/* {isShow && (
        <div className="message-container-files-grid">
          {history.files &&
            history.files.map(({ id, name, path }) => (
              <ChipFileMessage
                className="pointer message-files-list"
                key={id}
                text={normalizeFileName(name)}
                link={path + '/' + name}
              />
            ))}
        </div>
      )} */}
    </div>
  );
};

export default InfoHistory;

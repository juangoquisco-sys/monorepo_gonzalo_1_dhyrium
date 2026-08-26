import { useState, type ReactNode } from 'react';
import Button from '@/components/button/Button';
import IconAction from '@/components/iconAction/IconAction';
import type { MessageType } from '@/types/types';
import LabelStatus from '../../components/labelStatus/LabelStatus';
import ProcedureHistory from '../../components/procedureHistory/ProcedureHistory';
import './procedureMoreInfo.css';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import InfoHistory from '../infoHistory/InfoHistory';
import type { TypeProcedure } from '../../models/types';

interface ProcedureMoreInfoProps {
  message: MessageType;
  status: string;
  userInitSender: string;
  footer?: ReactNode;
  typeProcedure?: TypeProcedure;
}

const ProcedureMoreInfo = ({
  message,
  status,
  userInitSender,
  footer,
  typeProcedure = 'payProcedure',
}: ProcedureMoreInfoProps) => {
  const [viewHistory, setViewHistory] = useState(false);

  const handleViewHistory = () => setViewHistory(!viewHistory);
  return (
    <div className="procedureMoreInfo  procedureMoreInfo-contain--left">
      <div className="procedureMoreInfo-header-content ">
        <div className="procedureMoreInfo-sender-info-details">
          <div className="procedureMoreInfo-sender-name">
            Tramitante:{' '}
            <span className="procedureMoreInfo-sender-info">
              <IconAction icon="user-sender" position="none" /> {userInitSender}
            </span>
          </div>
          <LabelStatus status={status} />
        </div>
        <span className="procedureMoreInfo-date-send">
          {formatDayDateTimeUtc(message.createdAt)}
        </span>
      </div>
      <div className="procedureMoreInfo-main">
        <ProcedureHistory
          messageHistory={message}
          userMessage={
            message?.userInit?.user.profile ||
            message?.initialSender?.user.profile
          }
          typeProcedure={typeProcedure}
        />
        {message?.history.length > 0 && (
          <div className="regularProcedureInfo-btn-expand">
            <Button
              text="Bitácora del trámite"
              icon="history/bitacora"
              onClick={handleViewHistory}
              variant="outline"
              borderColor="secondary"
              color="secondary"
              full
            />
          </div>
        )}
        {viewHistory && (
          <div className="procedureHistory-container">
            <span className="procedure-back-icon" onClick={handleViewHistory}>
              <img src="/svg/arrow-left.svg" alt="" />
              <h4>Atrás</h4>
            </span>
            {[...message?.history].reverse().map(history => {
              if (history.description === null) {
                return;
              }
              return <InfoHistory history={history} key={history.id} />;
            })}
          </div>
        )}
        {/* <div className="procedureMoreInfo-container-files-grid">
          {viewHistory &&
            [...message?.history]
              .reverse()
              .map(history => (
                <ProcedureHistory
                  messageHistory={history}
                  key={history.id}
                  userMessage={history.user.profile}
                />
              ))}
        </div> */}
      </div>
      {footer}
    </div>
  );
};

export default ProcedureMoreInfo;

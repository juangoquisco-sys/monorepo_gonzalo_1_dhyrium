import {
  isOpenViewHtmlToPdf$,
  isOpenViewPdf$,
} from '@/services/sharingSubject';
import type { MessageReply, MessageType, ProfileShort } from '@/types/types';
import './procedureHistory.css';
import { capitalizeText, normalizeFileName } from '@/utils/tools';
import ChipFileMessage from '../../pages/paymentProcessing/components/chipFileMessage/ChipFileMessage';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import {
  PiFilePdfFill,
  PiEye,
  PiNotebook,
  PiArrowSquareOut,
} from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import Button from '@/components/button/Button';
import useNavigateWithParams from '@/hooks/useNavigateWithParams';
import type { TypeProcedure } from '../../models/types';

interface ProcedureHistoryProps {
  messageHistory: MessageReply | MessageType;
  userMessage: ProfileShort;
  typeProcedure?: TypeProcedure;
}
const ProcedureHistory = ({
  messageHistory,
  userMessage,
  typeProcedure = 'payProcedure',
}: ProcedureHistoryProps) => {
  const navigateWithParams = useNavigateWithParams();

  const viewPdf = async (size: 'a4' | 'a5') => {
    const { mainDocument } = messageHistory;
    if (!mainDocument) return;
    const mainDocumentUrl = `${URL}/${mainDocument.path}/${mainDocument.name}`;
    if (size === 'a4') {
      isOpenViewPdf$.setSubject = {
        fileNamePdf: messageHistory.title,
        isOpen: true,
        pdfUrl: mainDocumentUrl,
      };
    }
    if (size === 'a5') {
      axiosInstance
        .post(
          `/generate-pdf/two-pages?url=${mainDocument.path}/${mainDocument.name}&fileName=${mainDocument.name}`,
          {},
          { responseType: 'blob' }
        )
        .then(res => {
          isOpenViewHtmlToPdf$.setSubject = {
            isOpen: true,
            fileNamePdf: messageHistory.title,
            pdfBlob: res.data,
          };
        });
    }
  };

  const handleNavigateReport = (reportId: number) => {
    navigateWithParams(`report/${reportId}`, {
      state: {
        noViewButtonBack: true,
        noViewActionsRow: true,
      },
    });
  };

  return (
    <div className="procedureHistory">
      <div className="procedureHistory-info">
        <div className="procedureHistory-title-contain">
          <div style={{ height: 21 }}>
            <PiFilePdfFill size={21} color={COLOR_CSS.secondary} />
          </div>
          <h4 className="message-title">
            {messageHistory.title.replace(
              messageHistory.type,
              capitalizeText(messageHistory.type)
            )}
          </h4>
        </div>
        <div className="procedureHistory-subtitle-contain">
          <span className="procedureHistory-subtitle">
            Asunto:{' '}
            <span className="procedureHistory-subtitle-value">
              {messageHistory.header}
            </span>
          </span>
          <div className="procedureHistory-subtitle-options">
            <Button
              leftIcon={<PiEye size={17} />}
              text="A4"
              size="xxs"
              variant="outline"
              onClick={() => viewPdf('a4')}
            />
            <Button
              leftIcon={<PiEye size={17} />}
              text="A5"
              size="xxs"
              variant="outline"
              onClick={() => viewPdf('a5')}
            />
          </div>
        </div>
        <div className="ProcedureHistory-report-buttons">
          {typeProcedure === 'payProcedure' &&
            messageHistory.report.map((report, index) => (
              <Button
                text={
                  'Ver Reporte' +
                  (messageHistory.report.length > 1 ? ` ${index + 1}` : '')
                }
                color="gray"
                variant="outline"
                leftIcon={<PiNotebook size={21} />}
                rightIcon={<PiArrowSquareOut size={21} />}
                size="xxs"
                onClick={() => handleNavigateReport(report.id)}
              />
            ))}
        </div>
      </div>
      {messageHistory.mainDocument && (
        <object
          data={`${URL}/${messageHistory.mainDocument.path.replace(
            'public',
            'file-user'
          )}/${messageHistory.mainDocument.name}`}
          type="application/pdf"
          style={{ width: '100%', aspectRatio: 0.75, height: '34.375rem' }}
        />
      )}
      <div className="message-sender-info">
        <span className="message-sender-name">
          Enviado por{' '}
          <b>
            {userMessage.lastName} {userMessage.firstName}
          </b>
        </span>
        <span className="message-date-send">
          {formatDayDateTimeUtc(messageHistory.createdAt)}
        </span>
      </div>
      <div className="message-container-files-grid">
        {messageHistory.files &&
          messageHistory.files.map(({ id, name, path }) => (
            <ChipFileMessage
              className="pointer message-files-list"
              key={id}
              text={normalizeFileName(name)}
              link={path + '/' + name}
            />
          ))}
      </div>
    </div>
  );
};

export default ProcedureHistory;

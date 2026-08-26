import { useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import type { InfoDataReport, Level } from '@/types/types';
import './moreInfo.css';
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { Subscription } from 'rxjs';
import { toggle$ } from '@/services/sharingSubject';
import { excelSimpleReport } from '@/utils/excelGenerate/excelReportForLevel';
import { formatMoney } from '@/utils/tools';
import { MoreInfoUsers } from '../moreInfoUsers/MoreInfoUsers';
import FloatingText from '@/components/floatingText/FloatingText';
import { formatDateWeekdayUtc } from '@/utils/dayjsSpanish';
import { ProjectRole } from '../../models/definitiosProject';
import { ProjectContext } from '../../context/ProjectContext';
import useOptionLevels from '../../hooks/useOptionLevels';
import { getParticipantSummary } from '../../utils/normalizeProjectLevel';
interface MoreInfoProps {
  data: Level;
}
export const MoreInfo = ({ data }: MoreInfoProps) => {
  const { stageId } = useParams();
  const { archiverOptions } = useOptionLevels({ data });

  const [showArchiverOption, setShowArchiverOption] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const handleToggleRef = useRef<Subscription>(new Subscription());
  const { hasPermission } = useContext(ProjectContext);
  useEffect(() => {
    handleToggleRef.current = toggle$.getSubject.subscribe((value: boolean) => {
      setShowArchiverOption(value);
    });
    return () => {
      handleToggleRef.current.unsubscribe();
    };
  }, []);
  const handleReports = () => {
    axiosInstance.get<InfoDataReport>(`/stages/report/${stageId}`).then(res => {
      const {
        department,
        district,
        province,
        initialDate,
        cui,
        projectName,
        moderatorName,
        finishDate,
      } = res.data;

      const infoData = {
        department,
        district,
        province,
        initialDate: formatDateWeekdayUtc(initialDate),
        cui,
        projectName,
        moderatorName,
        finishDate,
      };
      excelSimpleReport(data, infoData, 'areas');
    });
  };

  const handleViewUsers = () => setShowUsers(!showUsers);
  const handleArchiverOptions = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setShowArchiverOption(!showArchiverOption);
  };

  return (
    <>
      <div className="moreInfo-currency-contain">
        <div className="moreInfo-currency moreInfo-currency-width">
          <span className="moreInfo-currency-money">{data.days}</span>
          {data.projectName && (
            <span className="moreInfo-currency-info">
              Dia{data.days !== 1 && 's'}
            </span>
          )}
        </div>
        <div className="moreInfo-currency">
          <span className="moreInfo-currency-money">
            {data?.percentage?.toFixed(2)}%
          </span>
          {data.projectName && (
            <span className="moreInfo-currency-info">Porcentaje</span>
          )}
        </div>
        <div className="moreInfo-currency">
          <FloatingText
            text={'-/S. ' + data.balance.toFixed(2)}
            xPos={3}
            yPos={15}
          >
            <span className="moreInfo-currency-money">
              S/.{formatMoney(data.balance)}
            </span>
          </FloatingText>
          {data.projectName && (
            <span className="moreInfo-currency-info">Saldo</span>
          )}
        </div>
        <div className="moreInfo-currency">
          <FloatingText
            text={'-/S. ' + data.spending.toFixed(2)}
            xPos={3}
            yPos={15}
          >
            <span className="moreInfo-currency-money money--red">
              -/S.{formatMoney(data.spending)}
            </span>
          </FloatingText>
          {data.projectName && (
            <span className="moreInfo-currency-info">Gasto</span>
          )}
        </div>
        <div className="moreInfo-currency">
          <FloatingText
            text={'-/S. ' + data.price.toFixed(2)}
            xPos={3}
            yPos={15}
          >
            <span className="moreInfo-currency-money">
              S/.{formatMoney(data.price)}
            </span>
          </FloatingText>
          {data.projectName && (
            <span className="moreInfo-currency-info">Total</span>
          )}
        </div>

        <div className="moreInfo-currency moreInfo-currency-width">
          <span className="moreInfo-currency-money">{data.total}</span>
          {data.projectName && (
            <span className="moreInfo-currency-info">Tareas</span>
          )}
        </div>
      </div>
      {hasPermission(ProjectRole.MODERATOR) && (
        <div className="moreInfo-details-contain">
          <div
            className="moreInfo-detail"
            title={'Ver Usuarios'}
            onClick={handleViewUsers}
          >
            {showUsers && <MoreInfoUsers users={getParticipantSummary(data)} />}
            <div className="moreInfo-detail-container">
              <figure className="moreInfo-detail-icon">
                <img src="/svg/person-blue.svg" alt="W3Schools" />
              </figure>
              {data.projectName && (
                <span className="moreInfo-detail-info">Ver Usuarios</span>
              )}
            </div>
          </div>

          <div
            className="moreInfo-detail"
            title={'Comprimir PDFs'}
            onClick={handleArchiverOptions}
          >
            {showArchiverOption && (
              <div className="moreInfo-details-contain moreInfo-details-absolute">
                {archiverOptions.map(({ fn, icon, name }) => (
                  <div
                    key={icon}
                    className="moreInfo-detail"
                    onClick={fn}
                    title={name}
                  >
                    <figure className="moreInfo-detail-icon">
                      <img src={`/svg/${icon}.svg`} alt="W3Schools" />
                    </figure>
                    <span className="moreInfo-detail-info">{name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="moreInfo-detail-container">
              <figure className="moreInfo-detail-icon">
                <img src="/svg/compres-icon.svg" alt="W3Schools" />
              </figure>
              {data.projectName && (
                <span className="moreInfo-detail-info">Comprimir</span>
              )}
            </div>
          </div>
          <div
            className="moreInfo-detail"
            title={'Comprimir Editables'}
            onClick={handleReports}
          >
            <div className="moreInfo-detail-container">
              <figure className="moreInfo-detail-icon">
                <img src="/svg/reportExcel-icon.svg" alt="W3Schools" />
              </figure>
              {data.projectName && (
                <span className="moreInfo-detail-info">
                  Generar <br /> reporte
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoreInfo;

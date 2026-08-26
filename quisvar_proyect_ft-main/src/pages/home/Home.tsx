import './home.css';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  FileText,
  FolderKanban,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { axiosInstance } from '@/services/axiosInstance';
import type { licenseList } from '@/types/types';
import { formatDate } from '@/utils/formatDate';
import Button from '@/components/button/Button';
import { isOpenCardFiles$ } from '@/services/sharingSubject';
import CardMoreOptions from './views/CardMoreOptions';
import CardOpenFile from '../userCenter/pages/users/views/cardOpenFile/CardOpenFile';
import RecentProjects from './views/RecentProjects';
import RecentTask from './views/RecentTask';
import {
  getMyDutyEntitlements,
  getMyUpcomingDutyAssignments,
  getOpenPoolDutyRequests,
} from '../dutyRotations/services/dutyRotations.service';

const GMT = 5 * 60 * 60 * 1000;
const RETURN_GRACE_MS = 20 * 60 * 1000;
type LicenseRes = {
  licenses: licenseList[];
  count: number;
};
export const Home = () => {
  const { id, profile } = useSelector((state: RootState) => state.userSession);
  const [licenseData, setLicenseData] = useState<licenseList>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewCard, setViewCard] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [showPenaltyInfo, setShowPenaltyInfo] = useState(false);
  const [now, setNow] = useState(new Date());

  const navigate = useNavigate();
  const handleNavigateToAreas = () => navigate('/especialidades');
  const handleNavigateMyWorks = () => navigate('/mis-tareas');
  const handleNavigateRotations = () => navigate('/rotaciones/mis-turnos');
  // const handleNavigateReports = () => navigate('/lista-de-notificaciones');
  // const handleNavigateMyAdmin = () => {
  //   return;
  //   // if (role !== 'EMPLOYEE') {
  //   //   handleNavigateReports();
  //   // } else {
  //   //   handleNavigateMyWorks();
  //   // }
  // };
  const viewLicense = useCallback(() => {
    const now = new Date();
    const early = 2 * 60 * 60 * 1000;
    axiosInstance
      .get<LicenseRes>(
        `/license/employee/${id}?includeRecurringChildren=true&pageSize=100`,
        {
          headers: {
            noLoader: true,
          },
        }
      )
      .then(res => {
        const currentLicense = res.data.licenses.find(license => {
          const untilDate = new Date(
            new Date(license.untilDate).getTime() + GMT
          );
          const isInsideReturnGrace =
            now.getTime() <= untilDate.getTime() + RETURN_GRACE_MS;
          return (
            (license.status === 'ACTIVO' || license.status === 'INACTIVO') &&
            !license.fine &&
            isInsideReturnGrace
          );
        });
        if (!currentLicense) {
          setLicenseData(undefined);
          setViewCard(false);
          return;
        }
        const untilDate = new Date(
          new Date(currentLicense.untilDate).getTime() + GMT
        );
        const timer = now.getTime() > untilDate.getTime() - early;
        if (currentLicense.status === 'ACTIVO' && !currentLicense.fine) {
          setLicenseData(currentLicense);
          setViewCard(true);
        }
        if (
          currentLicense.status === 'ACTIVO' &&
          timer &&
          !currentLicense.fine
        ) {
          setLicenseData(currentLicense);
          setViewCard(true);
        }
        if (currentLicense.status === 'INACTIVO' && !currentLicense.fine) {
          setLicenseData(currentLicense);
          setViewCard(true);
          return;
        }
        if (currentLicense.status !== 'ACTIVO' || currentLicense.fine) {
          setLicenseData(undefined);
          setViewCard(false);
        }
      });
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (licenseData && !licenseData.fine) {
      const now = new Date();
      const early = 2 * 60 * 60 * 1000;
      const untilDate = new Date(
        new Date(licenseData.untilDate).getTime() + GMT
      );
      const timeDifference = now.getTime() - (untilDate.getTime() - early);
      if (timeDifference < 0) {
        setTimeout(() => {
          viewLicense();
        }, Math.abs(timeDifference));
      }
    }
  }, [licenseData, viewLicense]);

  useEffect(() => {
    if (id !== 0) {
      viewLicense();
    }
  }, [id, viewLicense]);

  const myUpcomingRotationsQuery = useQuery({
    queryKey: ['home', 'duty-rotations', 'my-upcoming', id],
    queryFn: getMyUpcomingDutyAssignments,
    enabled: id !== 0,
    retry: false,
    staleTime: 60_000,
  });
  const myRotationEntitlementsQuery = useQuery({
    queryKey: ['home', 'duty-rotations', 'my-entitlements', id],
    queryFn: () => getMyDutyEntitlements(),
    enabled: id !== 0,
    retry: false,
    staleTime: 60_000,
  });
  const openPoolRotationsQuery = useQuery({
    queryKey: ['home', 'duty-rotations', 'open-pool', id],
    queryFn: getOpenPoolDutyRequests,
    enabled: id !== 0,
    retry: false,
    staleTime: 60_000,
  });
  const myUpcomingRotations = myUpcomingRotationsQuery.data ?? [];
  const myRotationEntitlements = myRotationEntitlementsQuery.data ?? [];
  const openPoolRotations = openPoolRotationsQuery.data ?? [];
  const nextRotation = myUpcomingRotations[0];
  const rotationsNoticeCount =
    myUpcomingRotations.length +
    myRotationEntitlements.length +
    openPoolRotations.length;
  const hasRotationsNotice = rotationsNoticeCount > 0;
  const parseHomeDate = (value?: string | Date | null, dateOnly = false) => {
    if (!value) return null;
    const normalizedValue = String(value);
    const parsed = new Date(
      dateOnly && !normalizedValue.includes('T')
        ? `${normalizedValue}T00:00:00`
        : normalizedValue
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const formatRotationDate = (value?: string) => {
    const parsedDate = parseHomeDate(value, true);
    if (!parsedDate) return 'Sin fecha';
    return formatDate(parsedDate, {
      day: '2-digit',
      weekday: 'short',
      month: 'short',
    });
  };
  const getDate = (value: string) => {
    const time = parseHomeDate(value);
    if (!time) return 'Sin fecha';
    const gmtMinus5Time = new Date(time.getTime() + GMT);
    return formatDate(gmtMinus5Time, {
      day: '2-digit',
      weekday: 'short',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };
  const getLicenseType = (license?: licenseList) => {
    if (!license) return 'Permiso';
    if (license.reason?.startsWith('Salida de campo')) return 'Salida de campo';
    if (license.reason?.startsWith('Tramite documentario')) {
      return 'Tramite documentario';
    }
    if (license.reason?.startsWith('Licencia personal')) {
      return 'Licencia personal';
    }
    if (license.reason?.startsWith('Otros')) return 'Otros';
    return license.type === 'SALIDA' ? 'Salida' : 'Licencia personal';
  };
  const getLicenseDescription = (license?: licenseList) => {
    if (!license?.reason) return 'Sin detalle';
    const separators = [' - Proyecto: ', ' - '];
    const separator = separators.find(item => license.reason?.includes(item));
    if (!separator) return license.reason;
    return (
      license.reason.split(separator).slice(1).join(separator) || 'Sin detalle'
    );
  };
  const licenseTimeInfo = useMemo(() => {
    if (!licenseData) return null;
    const untilDate = new Date(new Date(licenseData.untilDate).getTime() + GMT);
    const diff = untilDate.getTime() - now.getTime();
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / (60 * 60 * 1000));
    const minutes = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000));
    return {
      isLate: diff < 0,
      text:
        diff < 0
          ? `Retraso: ${hours}h ${minutes}min`
          : `Tiempo restante: ${hours}h ${minutes}min`,
    };
  }, [licenseData, now]);
  const calculateFineState = () => {
    if (!licenseData || !licenseData.untilDate) {
      return ''; // No hay datos suficientes para calcular el estado
    }

    const now = new Date();
    const untilDate = new Date(licenseData.untilDate);
    const timeDifference = now.getTime() - (untilDate.getTime() + GMT);
    if (timeDifference >= 20 * 60 * 1000) {
      return 'MUY_GRAVE';
    } else if (timeDifference >= 15 * 60 * 1000) {
      return 'GRAVE';
    } else if (timeDifference >= 10 * 60 * 1000) {
      return 'SIMPLE';
    } else if (timeDifference >= 3 * 60 * 1000) {
      return 'TARDE';
    }

    return 'PUNTUAL';
  };
  const handleCheckout = () => {
    const now = new Date();
    now.setHours(now.getHours() - 5);
    setIsCheckingOut(true);
    axiosInstance
      .patch(`/license/checkout/${licenseData?.id}`, {
        checkout: now,
        fine: calculateFineState(),
        status: 'INACTIVO',
      })
      .then(() => {
        setViewCard(false);
        setIsCheckingOut(false);
        viewLicense();
      })
      .catch(() => {
        setIsCheckingOut(false);
      });
  };
  const handleOpenCardFiles = () => {
    isOpenCardFiles$.setSubject = {
      isOpen: true,
    };
  };

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  return (
    <div className="home">
      <button
        className="home-moreOptionsButton"
        type="button"
        aria-label="Abrir modulos de DHYRIUM SAA"
        aria-expanded={isExpanded}
        aria-controls="home-module-menu"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <img src="/svg/more-options.svg" alt="" aria-hidden="true" />
      </button>
      {isExpanded && <CardMoreOptions />}
      <div className="home-content">
        <section className="home-hero" aria-labelledby="home-title">
          <span className="home-kicker">Panel operativo</span>
          <h1 className="home-title" id="home-title">
            {profile.gender === 'F' ? (
              <>
                Bienvenida{' '}
                <span className="title-content-span">{profile.firstName}</span>
              </>
            ) : (
              <>
                Bienvenido{' '}
                <span className="title-content-span">{profile.firstName}</span>
              </>
            )}
          </h1>

          <p className="paragraph">
            Todo lo que necesitas para avanzar está aquí: organiza, conecta y
            haz que cada día cuente.
          </p>
          <div className="btn-section">
            <button
              className="home-btn btn-color-1"
              onClick={handleNavigateMyWorks}
            >
              <span className="home-btn-icon">
                <ClipboardList aria-hidden="true" />
              </span>
              <span>Mis tareas</span>
              <ArrowRight aria-hidden="true" />
            </button>
            <button
              className="home-btn btn-color-2"
              onClick={handleNavigateToAreas}
            >
              <span className="home-btn-icon">
                <FolderKanban aria-hidden="true" />
              </span>
              <span>Proyectos</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>

          <Button
            text="Ver directivas"
            onClick={handleOpenCardFiles}
            variant="outline"
            leftIcon={<FileText aria-hidden="true" />}
          />
        </section>
        {hasRotationsNotice && (
          <section className="home-rotations-notice">
            <div className="hrn-main">
              <div className="hrn-icon">
                <CircleAlert />
              </div>
              <div>
                <span className="hrn-eyebrow">Rotaciones</span>
                <h2>
                  {myUpcomingRotations.length
                    ? 'Tienes turnos por revisar'
                    : myRotationEntitlements.length
                    ? 'Tienes responsabilidades habilitadas'
                    : 'Hay turnos disponibles para tomar'}
                </h2>
                <p>
                  {nextRotation
                    ? `${nextRotation.duty.name} · ${formatRotationDate(
                        nextRotation.periodStart
                      )} · ${nextRotation.slotLabel}`
                    : 'Revisa la bandeja personal de rotaciones para tomar acción.'}
                </p>
              </div>
            </div>

            <div className="hrn-metrics">
              <span>
                <CalendarClock />
                {myUpcomingRotations.length} proximos
              </span>
              <span>
                <ShieldCheck />
                {myRotationEntitlements.length} habilitados
              </span>
              <span>
                <Send />
                {openPoolRotations.length} disponibles
              </span>
            </div>

            <button
              className="hrn-action"
              onClick={handleNavigateRotations}
              title="Abre Mis turnos para completar, revisar o tomar turnos disponibles."
            >
              <CalendarClock aria-hidden="true" />
              Ir a mis turnos
            </button>
          </section>
        )}
        <div className="home-recents">
          <RecentProjects />
          <RecentTask />
        </div>
      </div>
      {viewCard && licenseData && (
        <div className="home-license-card">
          <div className="hl-header">
            <div>
              <span className="hl-eyebrow">Permiso en curso</span>
              <h2>{getLicenseType(licenseData)}</h2>
            </div>
            <button
              className="hl-help"
              type="button"
              aria-label="Ver reglas de penalizacion"
              onMouseEnter={() => setShowPenaltyInfo(true)}
              onMouseLeave={() => setShowPenaltyInfo(false)}
              onFocus={() => setShowPenaltyInfo(true)}
              onBlur={() => setShowPenaltyInfo(false)}
            >
              ?
            </button>
            {showPenaltyInfo && (
              <div className="hl-help-panel">
                <strong>Reglas de llegada</strong>
                <span>3 min de retraso: TARDE</span>
                <span>Mas de 10 min: FALTA SIMPLE</span>
                <span>Mas de 15 min: FALTA GRAVE</span>
                <span>Mas de 20 min: FALTA MUY GRAVE</span>
              </div>
            )}
            {licenseTimeInfo && (
              <span
                className={`hl-status ${
                  licenseTimeInfo.isLate ? 'hl-status-late' : 'hl-status-ok'
                }`}
              >
                {licenseTimeInfo.isLate ? 'Tarde' : 'Activo'}
              </span>
            )}
          </div>
          <p className="hl-reason" title={getLicenseDescription(licenseData)}>
            {getLicenseDescription(licenseData)}
          </p>
          <div className="hl-info">
            <div className="hl-date">
              <h4>Salida:</h4>
              <p>{getDate(licenseData.startDate)}</p>
            </div>
            <div className="hl-date">
              <h4>Retorno:</h4>
              <p>{getDate(licenseData.untilDate)}</p>
            </div>
          </div>
          {licenseTimeInfo && (
            <div className="hl-countdown">{licenseTimeInfo.text}</div>
          )}
          <button
            className="hl-btn hl-btn-active"
            onClick={handleCheckout}
            disabled={isCheckingOut}
            title="Registrar llegada con fecha y hora actual"
          >
            {isCheckingOut ? 'Registrando...' : 'Registrar llegada ahora'}
          </button>
          <p className="hl-details">Se guardara la fecha y hora actual.</p>
        </div>
      )}
      <CardOpenFile />
    </div>
  );
};

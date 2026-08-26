import { useParams } from 'react-router-dom';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Award,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  GraduationCap,
  History,
  UserRound,
} from 'lucide-react';
import './specialistInformation.css';
import { getIconDefault } from '@/utils/tools';
import type {
  AreaSpecialty,
  Experience,
  // SpecialistProject,
  Specialists,
  Training,
  TrainingSpecialty,
} from '@/types/types';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { AppButton } from '@/components/app-ui/app-button';
import {
  isOpenAddExperience$,
  isOpenAddTraining$,
  isOpenCardSpecialist$,
} from '@/services/sharingSubject';
import { ExperienceInformation } from './components/experienceInformation/ExperienceInformation';
import TrainingInformation from './components/trainingInformation/TrainingInformation';
import CardAddExperience from './views/cardAddExperience/CardAddExperience';
import CardAddTraining from './views/cardAddTraining/CardAddTraining';
// import { CardSpecialist } from '../../views';

type SpecialistHistoryItem = {
  id: number;
  createdAt: string;
  listSpecialties: { name: string };
  contratc: {
    id: number;
    contractNumber: string;
    projectName: string;
    projectShortName: string | null;
    type: string;
    createdAt: string | null;
  };
};

type DetailSectionProps = {
  title: string;
  icon: typeof UserRound;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const DetailSection = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: DetailSectionProps) => (
  <section className="specialist-detail-section">
    <button
      type="button"
      className="specialist-detail-section-trigger"
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <span className="specialist-detail-section-title">
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </span>
      <ChevronDown
        className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
    {isOpen && <div className="specialist-detail-section-content">{children}</div>}
  </section>
);

export const SpecialistInformation = () => {
  const { infoId } = useParams();
  const [data, setData] = useState<Specialists>();
  const [experiences, setExperiences] = useState<Experience[]>();
  const [training, setTraining] = useState<Training[]>();
  const [history, setHistory] = useState<SpecialistHistoryItem[]>([]);
  const [openSection, setOpenSection] = useState('Ficha de usuario');
  const getSpecialist = useCallback(() => {
    axiosInstance
      .get(`/specialists/information/${infoId}`)
      .then(item => setData(item.data));
  }, [infoId]);
  const getExperience = useCallback(() => {
    axiosInstance
      .get(`/areaSpecialtyList/${infoId}`)
      .then(item => setExperiences(item.data));
  }, [infoId]);
  const getTraining = useCallback(() => {
    axiosInstance
      .get(`/trainingSpecialtyList/${infoId}`)
      .then(item => setTraining(item.data));
  }, [infoId]);
  const getHistory = useCallback(() => {
    axiosInstance
      .get(`/specialists/history/${infoId}`)
      .then(item => setHistory(item.data))
      .catch(() => setHistory([]));
  }, [infoId]);
  useEffect(() => {
    getSpecialist();
    getExperience();
    getTraining();
    getHistory();
  }, [getExperience, getHistory, getSpecialist, getTraining, infoId]);
  const handleAddExperience = (value: boolean, identifier: number) => {
    isOpenAddExperience$.setSubject = {
      isOpen: value,
      id: identifier,
    };
  };
  const handleEditExperience = (
    value: boolean,
    identifier: number,
    data: AreaSpecialty
  ) => {
    isOpenAddExperience$.setSubject = {
      isOpen: value,
      id: identifier,
      data,
    };
  };
  const handleAddTraining = (value: boolean, identifier: number) => {
    isOpenAddTraining$.setSubject = {
      isOpen: value,
      id: identifier,
    };
  };
  const handleEditTraining = (
    value: boolean,
    trainingListId: number,
    recordId: number,
    data: TrainingSpecialty
  ) => {
    isOpenAddTraining$.setSubject = {
      isOpen: value,
      id: trainingListId,
      recordId,
      data,
    };
  };
  const handleEditInfo = (specialist?: Specialists) => {
    isOpenCardSpecialist$.setSubject = {
      isOpen: true,
      data: specialist,
      function: () => getSpecialist(),
    };
  };
  const toggleSection = (section: string) => {
    setOpenSection(current => (current === section ? '' : section));
  };
  const formatHistoryDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
          new Date(value)
        )
      : 'Sin fecha';

  return (
    <div className="specialist-detail-workspace">
      <DetailSection
        title="Ficha de usuario"
        icon={UserRound}
        isOpen={openSection === 'Ficha de usuario'}
        onToggle={() => toggleSection('Ficha de usuario')}
      >
        <div className="specialist-profile-summary">
          <img
            className="specialist-profile-avatar"
            src={data ? getIconDefault(data.lastName) : '/svg/user_icon.svg'}
            alt=""
          />
          <div className="specialist-profile-copy">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1>{data ? `${data.firstName} ${data.lastName}` : 'Cargando...'}</h1>
              <AppButton
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleEditInfo(data)}
              >
                Editar ficha
              </AppButton>
            </div>
            <dl className="specialist-detail-grid">
              <div><dt>DNI</dt><dd>{data?.dni ?? '—'}</dd></div>
              <div><dt>Correo</dt><dd>{data?.email ?? '—'}</dd></div>
              <div><dt>Teléfono</dt><dd>{data?.phone ?? '—'}</dd></div>
              <div>
                <dt>Curriculum vitae</dt>
                <dd>
                  {data?.cvFile ? (
                    <a href={`${URL}/file-user/cv/${data.cvFile}`} target="_blank" rel="noreferrer">
                      Ver CV
                    </a>
                  ) : 'Pendiente'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </DetailSection>

      <DetailSection
        title="Grado académico"
        icon={GraduationCap}
        isOpen={openSection === 'Grado académico'}
        onToggle={() => toggleSection('Grado académico')}
      >
        <dl className="specialist-detail-grid">
          <div><dt>Carrera</dt><dd>{data?.career ?? '—'}</dd></div>
          <div><dt>Grado académico</dt><dd>{data?.degree ?? '—'}</dd></div>
          <div><dt>Colegiatura</dt><dd>{data?.tuition ?? '—'}</dd></div>
          <div><dt>Inscripción</dt><dd>{data?.inscription ?? '—'}</dd></div>
        </dl>
      </DetailSection>

      <DetailSection
        title="Experiencia"
        icon={BriefcaseBusiness}
        isOpen={openSection === 'Experiencia'}
        onToggle={() => toggleSection('Experiencia')}
      >
        <ExperienceInformation
          onSave={getExperience}
          handleAddExperience={handleAddExperience}
          handleEditExperience={handleEditExperience}
          experiences={experiences}
          showTitle={false}
        />
      </DetailSection>

      <DetailSection
        title="Capacitaciones"
        icon={Award}
        isOpen={openSection === 'Capacitaciones'}
        onToggle={() => toggleSection('Capacitaciones')}
      >
        <TrainingInformation
          training={training}
          onSave={getTraining}
          handleAddTraining={handleAddTraining}
          handleEditTraining={handleEditTraining}
          showTitle={false}
        />
      </DetailSection>

      <DetailSection
        title="Historial"
        icon={History}
        isOpen={openSection === 'Historial'}
        onToggle={() => toggleSection('Historial')}
      >
        {history.length ? (
          <ul className="specialist-history-list">
            {history.map(item => (
              <li key={item.id}>
                <FileText className="size-4" aria-hidden="true" />
                <div>
                  <strong>{item.contratc.projectShortName || item.contratc.projectName}</strong>
                  <span>
                    {item.contratc.contractNumber || 'Sin número'} · {item.listSpecialties.name}
                  </span>
                </div>
                <time>{formatHistoryDate(item.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="specialist-empty-state">No hay historial de contratos registrado para este especialista.</p>
        )}
      </DetailSection>

      <CardAddExperience onSave={getExperience} />
      <CardAddTraining onSave={getTraining} />
    </div>
  );
};

export default SpecialistInformation;

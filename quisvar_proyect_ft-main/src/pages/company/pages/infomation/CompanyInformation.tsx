import { Link, useParams } from 'react-router-dom';
import './companyInformation.css';
import { useCallback, useContext, useEffect, useState } from 'react';
import type { Companies } from '@/types/types';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { isOpenCardCompany$ } from '@/services/sharingSubject';
import { SocketContext } from '@/context/SocketContex';
// import { AnimatePresence, motion } from 'framer-motion';

export const CompanyInformation = () => {
  const { infoId } = useParams();
  const [data, setData] = useState<Companies>();
  const socket = useContext(SocketContext);
  const [, setProjectSelected] = useState<number | null>(null);
  // const toggleDetalleProyecto = (projectID: number) => {
  //   if (projectSelected === projectID) {
  //     setProjectSelected(null);
  //   } else {
  //     setProjectSelected(projectID);
  //   }
  // };
  const getCompanies = useCallback(() => {
    setData(undefined);
    axiosInstance
      .get(`/companies/information/${infoId}`)
      .then(item => setData(item.data));
  }, [infoId]);

  useEffect(() => {
    socket.on('server:company-update', () => {
      getCompanies();
    });

    return () => {
      socket.off('server:company-update');
    };
  }, []);
  useEffect(() => {
    getCompanies();
    return setProjectSelected(null);
  }, [getCompanies]);
  const handleAddCompany = (id?: number) => {
    isOpenCardCompany$.setSubject = {
      isOpen: true,
      id,
    };
  };
  const splitNames = (data?.manager as string)?.split(', ');
  return (
    <div className="company-detail-panel">
      <div className="company-data">
          <div className="company-main-info">
            <div className="company-icons-area">
              <Link
                to={`/empresas/archivo/company/${infoId}`}
                className="company-archive-link"
              >
                Archivo corporativo
              </Link>
              <div className="company-actions" aria-label="Acciones de la empresa">
                <button
                  type="button"
                  className="company-icon-button"
                  onClick={() => handleAddCompany(data?.id)}
                  title="Editar información de la empresa"
                  aria-label="Editar información de la empresa"
                >
                  <img src="/svg/pencil-line.svg" className="company-info-icon" />
                </button>
                <button
                  type="button"
                  className="company-cv-button"
                  title="Descargar CV"
                >
                  <img src="/svg/download.svg" className="company-info-icon" />
                  <span>CV</span>
                </button>
              </div>
            </div>
            <div className="company-profile">
              <figure className="company-main-figure">
                <img
                  src={
                    data?.img
                      ? `${URL}/images/img/companies/${data.img}`
                      : '/svg/office.svg'
                  }
                  alt={data?.name ? `Logotipo de ${data.name}` : 'Logotipo de empresa'}
                  onError={event => {
                    event.currentTarget.src = '/svg/office.svg';
                  }}
                />
              </figure>
              <div className="company-info-text">
                <p className="company-info-eyebrow">Empresa registrada</p>
                <h1 className="company-info-name">{data?.name || 'Empresa sin nombre'}</h1>
                <p className="company-info-ruc">RUC {data?.ruc || 'Pendiente de registro'}</p>
                <div className="company-representative">
                  <h2 className="company-info-section-title">Representante legal</h2>
                  {splitNames?.length > 0 ? (
                    splitNames.map((name, index) => <p key={index}>{name}</p>)
                  ) : (
                    <p className="company-info-pending">Pendiente de registro</p>
                  )}
                  <p className="company-info-pending">DNI pendiente de registro</p>
                </div>
              </div>
            </div>
        </div>
        <section
          className="company-aditional-info"
          aria-label="Datos registrales y bancarios"
        >
          <div className="company-info-rows">
            <strong>Ficha RUC</strong>
            <span className="company-info-pending">Pendiente de adjuntar</span>
          </div>
          <div className="company-info-rows">
            <strong>Domicilio fiscal y de notificación</strong>
            <span>{data?.address || 'Pendiente de registro'}</span>
          </div>
          <div className="company-info-rows">
            <strong>Partida registral</strong>
            <span>{data?.departure || 'Pendiente de registro'}</span>
          </div>
          <div className="company-info-rows">
            <strong>Vigencia de poder</strong>
            <span className="company-info-pending">Pendiente de registro</span>
          </div>
          <div className="company-info-rows">
            <strong>Cuenta bancaria / CCI</strong>
            <span>{data?.CCI || 'Pendiente de registro'}</span>
          </div>
          <div className="company-info-rows">
            <strong>Teléfono</strong>
            <span>{data?.phone || 'Pendiente de registro'}</span>
          </div>
          <div className="company-info-rows">
            <strong>Correo</strong>
            <span>{data?.email || 'Pendiente de registro'}</span>
          </div>
        </section>
        <section className="company-projects-list">
          <div className="company-projects-heading">
            <h2 className="company-info-section-title">
              Contratos y proyectos registrados
            </h2>
            <span>{data?.contracts?.length || 0} registrados</span>
          </div>
          {data?.contracts &&
            data.contracts?.map(project => (
              <article key={project.projectId} className="company-contract-item">
                <strong>
                  {project.projectShortName ?? 'Proyecto sin nombre corto'}
                </strong>
                <span>{project.projectName}</span>
              </article>
            ))}
          {!data?.contracts?.length && (
            <p className="company-info-pending">No hay contratos asociados.</p>
          )}
        </section>
      </div>
    </div>
  );
};

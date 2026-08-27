import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Button from '@/components/button/Button';
import Aside from '@/components/aside/Aside';
import { isOpenCardCompany$, isOpenCardConsortium$ } from '@/services/sharingSubject';
import './company.css';
import { useEffect, useState } from 'react';
import { axiosInstance, URL } from '@/services/axiosInstance';
import type { Companies, ConsortiumType, Option } from '@/types/types';
import CardCompany from './views/cardCompany/CardCompany';
import CardConsortium from './views/cardConsortium/CardConsortium';
import { Columns3, TableProperties } from 'lucide-react';

type CompanyView = 'table' | 'split';

export const Company = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isArchiveRoute = pathname.includes('/empresas/archivo/');
  const [companies, setCompanies] = useState<Companies[]>();
  const [consortiums, setConsortiums] = useState<ConsortiumType[]>();
  const [swap, setSwap] = useState(false);
  const [view, setView] = useState<CompanyView>('split');
  const [isOverview, setIsOverview] = useState(false);

  const getCompanies = () => {
    axiosInstance
      .get('/companies', { params: { source: 'contracts' } })
      .then(item => setCompanies(item.data));
  };
  const getConsortium = () => {
    axiosInstance.get('/consortium/all').then(item => setConsortiums(item.data));
  };

  useEffect(() => {
    getCompanies();
    getConsortium();
  }, []);

  useEffect(() => {
    if (!swap && companies?.length && (pathname === '/empresas' || pathname === '/empresas/')) {
      navigate(`informacion/${companies[0].id}`, { replace: true });
    }
  }, [companies, navigate, pathname, swap]);

  const handleAddCompany = (id?: number) => {
    isOpenCardCompany$.setSubject = { isOpen: true, id };
  };
  const handleAddConsortium = (id?: number) => {
    isOpenCardConsortium$.setSubject = { isOpen: true, id };
  };

  const renderDirectoryItem = (
    item: Companies | ConsortiumType,
    kind: 'company' | 'consortium'
  ) => {
    const isCompany = kind === 'company';
    const optionsData: Option[] = [{
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: () => isCompany ? handleAddCompany(item.id) : handleAddConsortium(item.id),
    }];
    return (
      <div key={`${kind}-${item.id}`}>
        <AppContextMenu data={optionsData}>
          <NavLink
            className="specialist-items company-directory-item"
            to={isCompany ? `informacion/${item.id}` : `consorcio/${item.id}`}
          >
            <div className="specialist-img-content">
              <img
                src={item.img
                  ? `${URL}/images/img/${isCompany ? 'companies' : 'consortium'}/${item.img}`
                  : '/svg/office.svg'}
                alt={item.name ? `Ícono de ${item.name}` : 'Ícono de empresa'}
                className="specialist-item-user-img"
                onError={event => {
                  event.currentTarget.src = '/svg/office.svg';
                }}
              />
            </div>
            <div className="specialist-items-content">
              <h3 className="specialist-item-name" title={item.name}>
                {item.name || 'Registro sin nombre'}
              </h3>
              <h3 className="specialist-item-dni">
                {isCompany
                  ? `RUC: ${(item as Companies).ruc}`
                  : typeof item.manager === 'string'
                    ? item.manager
                    : 'Representante pendiente'}
              </h3>
            </div>
          </NavLink>
        </AppContextMenu>
      </div>
    );
  };

  const openRecord = (item: Companies | ConsortiumType, kind: 'company' | 'consortium') => {
    setView('split');
    navigate(kind === 'company' ? `informacion/${item.id}` : `consorcio/${item.id}`);
  };

  const records = swap ? consortiums : companies;
  const totalRecords = (companies?.length || 0) + (consortiums?.length || 0);

  return (
    <div className="company-shell">
      {!isArchiveRoute && (
        <header className="company-view-header">
          <div className="company-directory-nav" aria-label="Directorio corporativo">
            <button
              type="button"
              className={`company-directory-brand ${isOverview ? 'is-active' : ''}`}
              onClick={() => setIsOverview(true)}
            >
              DHYRIUM
            </button>
            <button
              type="button"
              className={!isOverview && !swap ? 'is-active' : ''}
              onClick={() => {
                setSwap(false);
                setIsOverview(false);
              }}
            >
              Empresas
            </button>
            <button
              type="button"
              className={!isOverview && swap ? 'is-active' : ''}
              onClick={() => {
                setSwap(true);
                setIsOverview(false);
              }}
            >
              Consorcios
            </button>
          </div>
          {!isOverview && <div aria-label="Vista del directorio corporativo" className="company-view-switcher">
            <button
              type="button"
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
              className={view === 'table' ? 'is-active' : ''}
            >
              <TableProperties aria-hidden="true" className="size-4" />
              Tabla
            </button>
            <button
              type="button"
              aria-pressed={view === 'split'}
              onClick={() => setView('split')}
              className={view === 'split' ? 'is-active' : ''}
            >
              <Columns3 aria-hidden="true" className="size-4" />
              Ficha dividida
            </button>
          </div>}
        </header>
      )}
      {isOverview && !isArchiveRoute ? (
        <section className="company-overview" aria-label="Resumen corporativo">
          <div className="company-overview-intro">
            <span>DHYRIUM</span>
            <h1>Resumen corporativo</h1>
            <p>Consulta el total registrado de empresas y consorcios.</p>
          </div>
          <div className="company-overview-total">
            <span>Registros totales</span>
            <strong>{totalRecords}</strong>
            <small>Empresas y consorcios activos en el directorio</small>
          </div>
          <div className="company-overview-grid">
            <button type="button" className="company-overview-card is-company" onClick={() => { setSwap(false); setIsOverview(false); }}>
              <img src="/svg/office.svg" alt="" />
              <span>Empresas</span>
              <strong>{companies?.length || 0}</strong>
              <small>empresas registradas</small>
            </button>
            <button type="button" className="company-overview-card is-consortium" onClick={() => { setSwap(true); setIsOverview(false); }}>
              <img src="/svg/brief-blue.svg" alt="" />
              <span>Consorcios</span>
              <strong>{consortiums?.length || 0}</strong>
              <small>consorcios registrados</small>
            </button>
          </div>
        </section>
      ) : view === 'table' && !isArchiveRoute ? (
        <section className="company-table-view" aria-label="Tabla del directorio corporativo">
          <div className="company-table-toolbar">
            <div className="company-table-title">
              <span>{swap ? 'Consorcios registrados' : 'Empresas registradas'}</span>
              <small>{records?.length || 0} registros</small>
            </div>
            <button
              type="button"
              className="company-table-add"
              onClick={() => (!swap ? handleAddCompany() : handleAddConsortium())}
            >
              + Agregar {swap ? 'consorcio' : 'empresa'}
            </button>
          </div>
          <div className="company-table-scroll">
            <table className="company-data-table">
              <thead>
                <tr>
                  <th>{swap ? 'Consorcio' : 'Empresa'}</th>
                  <th>{swap ? 'Representante' : 'RUC'}</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {records?.map(item => {
                  const isCompany = !swap;
                  const company = item as Companies;
                  return (
                    <tr key={item.id} tabIndex={0} onClick={() => openRecord(item, isCompany ? 'company' : 'consortium')}>
                      <td>
                        <span className="company-table-company">
                          <img
                            src={item.img ? `${URL}/images/img/${isCompany ? 'companies' : 'consortium'}/${item.img}` : '/svg/office.svg'}
                            alt={item.name ? `Ícono de ${item.name}` : 'Ícono de empresa'}
                            onError={event => {
                              event.currentTarget.src = '/svg/office.svg';
                            }}
                          />
                          {item.name || 'Registro sin nombre'}
                        </span>
                      </td>
                      <td>{isCompany ? company.ruc || 'Pendiente' : typeof item.manager === 'string' ? item.manager : 'Pendiente'}</td>
                      <td>{isCompany ? company.phone || company.email || 'Sin contacto' : 'Sin contacto'}</td>
                      <td><span className="company-table-status">Activo</span></td>
                      <td><button type="button" className="company-table-edit" onClick={event => { event.stopPropagation(); openRecord(item, isCompany ? 'company' : 'consortium'); }}>Ver ficha</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
      <div className={`company${isArchiveRoute ? ' company--archive-route' : ''}`}>
      <Aside>
        <div className="company-directory-heading">
          <div>
            <span>Directorio</span>
            <strong>{swap ? 'Consorcios registrados' : 'Empresas registradas'}</strong>
          </div>
          <Button
            icon="plus-dark"
            onClick={() => (!swap ? handleAddCompany() : handleAddConsortium())}
            className="company-directory-add-btn"
            variant="outline"
          />
        </div>
        <div className="scroll-y">
          {!swap && companies?.map(item => renderDirectoryItem(item, 'company'))}
          {swap && consortiums?.map(item => renderDirectoryItem(item, 'consortium'))}
        </div>
      </Aside>
      <section className="specialist-info min-w-0 flex-1">
        <Outlet />
      </section>
      <CardCompany onSave={getCompanies} />
      <CardConsortium onSave={getConsortium} />
    </div>
      )}
    </div>
  );
};

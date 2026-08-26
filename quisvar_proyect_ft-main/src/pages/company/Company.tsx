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

export const Company = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isArchiveRoute = pathname.includes('/empresas/archivo/');
  const [companies, setCompanies] = useState<Companies[]>();
  const [consortiums, setConsortiums] = useState<ConsortiumType[]>();
  const [swap, setSwap] = useState(false);

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
                  : '/svg/user_icon.svg'}
                alt=""
                className="specialist-item-user-img"
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

  return (
    <div className={`company${isArchiveRoute ? ' company--archive-route' : ''}`}>
      <Aside>
        <div className="specialist-add-area">
          <button type="button" className={`consortium-title ${!swap ? 'cs-selected' : ''}`} onClick={() => setSwap(false)}>
            Empresas
          </button>
          <button type="button" className={`consortium-title ${swap ? 'cs-selected' : ''}`} onClick={() => setSwap(true)}>
            Consorcios
          </button>
          <Button
            icon="plus-dark"
            onClick={() => (!swap ? handleAddCompany() : handleAddConsortium())}
            className="specialist-add-btn"
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
  );
};

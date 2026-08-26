import { NavLink, Outlet, useParams } from 'react-router-dom';
import './officeStats.css';
import { FaUserPlus } from 'react-icons/fa6';
import { axiosInstance } from '@/services/axiosInstance';
import { useEffect, useState } from 'react';
import type { DivisionLeaderRes } from '../../types/types.response';
import { isOpenCardDivisionLeader$ } from '@/services/sharingSubject';
import CardDivisionLeader from './views/cardDivisionLeader/CardDivisionLeader';

const OfficeStats = () => {
  const { divisionId } = useParams();
  const [data, setData] = useState<DivisionLeaderRes>();
  const getDivision = (id: number) => {
    axiosInstance
      .get<DivisionLeaderRes>(`/division/${id}/leader`)
      .then(res => setData(res.data));
  };
  useEffect(() => {
    getDivision(Number(divisionId));
  }, [divisionId]);
  const handleOpenCard = () => {
    if (!data?.leaders) return;
    isOpenCardDivisionLeader$.setSubject = {
      isOpen: true,
      leaders: data?.leaders,
      id: Number(data?.id),
    };
  };
  return (
    <div className="os-main">
      <div className="os-title">
        <h1 className="os-title-text">Oficina: {data?.name}</h1>
      </div>
      <div className="os-leader">
        {data?.leaders && data?.leaders.length > 0 ? (
          data?.leaders.map((item, idx) => (
            <div key={idx} className="os-leader-item">
              <h1 className="os-leader-text">
                {item.profile.firstName + ' ' + item.profile.lastName}
              </h1>
            </div>
          ))
        ) : (
          <h1 className="os-leader-text">*Sin jefe de oficina</h1>
        )}
        <span className="os-leader-icon" onClick={handleOpenCard}>
          <FaUserPlus />
        </span>
      </div>
      <div className="os-navs">
        <NavLink
          to={`reuniones/${divisionId}`}
          className={({ isActive }) =>
            `os-options  ${isActive && 'os-selected'} `
          }
        >
          <h4>REUNIONES</h4>
        </NavLink>
        <NavLink
          to={`proyectos/${divisionId}`}
          className={({ isActive }) =>
            `os-options  ${isActive && 'os-selected'} `
          }
        >
          <h4>PROYECTOS</h4>
        </NavLink>
      </div>
      <Outlet />
      <CardDivisionLeader onSave={() => getDivision(Number(divisionId))} />
    </div>
  );
};

export default OfficeStats;

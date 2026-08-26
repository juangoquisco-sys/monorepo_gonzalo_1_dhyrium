import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import './groupContent.css';
import type { Group, Option } from '@/types/types';
import { isOpenCardAddGroup$ } from '@/services/sharingSubject';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Button from '@/components/button/Button';
import ButtonDelete from '@/components/button/ButtonDelete';
import CardAddGroup from './views/cardAddGroup/CardAddGroup';

export const GroupContent = () => {
  const { groupId, name } = useParams();
  const [members, setMembers] = useState<Group>();
  const [show, setShow] = useState<boolean>(true);
  const getUserGroup = useCallback(() => {
    axiosInstance.get(`/groups/${groupId}`).then(res => setMembers(res.data));
  }, [groupId]);

  useEffect(() => {
    getUserGroup();
  }, [getUserGroup, groupId]);
  // const hasCoordinator = members?.groups?.find(
  //   member => member.users.role === 'MOD' || member.users.role === 'SUPER_MOD'
  // );
  const handleOpenCard = (id: number) => {
    isOpenCardAddGroup$.setSubject = {
      isOpen: true,
      id,
    };
  };

  const changeMod = (id: number, boolMod: boolean, boolGuest: boolean) => {
    axiosInstance
      .patch(`groups/relation/${id}/${groupId}`, {
        mod: boolMod,
        guest: boolGuest,
      })
      .then(() => getUserGroup());
  };

  return (
    <div className="grc-main">
      <div className="grc-header">
        <h1 className="grc-group-title">
          {name}: {members?.name}
        </h1>
        <div className="grc-options-container">
          <div className="grc-navs">
            <NavLink
              to={`proyectos/${groupId}`}
              className={({ isActive }) =>
                `grc-options  ${isActive && 'grc-selected'} `
              }
            >
              <h4>PROYECTOS</h4>
            </NavLink>
            <NavLink
              to={`reuniones/${groupId}`}
              className={({ isActive }) =>
                `grc-options  ${isActive && 'grc-selected'} `
              }
            >
              <h4>REUNIONES DIARIAS</h4>
            </NavLink>
          </div>
          {/* <NavLink
            to={`semanal/${groupId}`}
            className={({ isActive }) =>
              `grc-options  ${isActive && 'grc-selected'} `
            }
          >
            <h4>COMPROMISOS SEMANALES</h4>
          </NavLink> */}
          <Button
            text={`${show ? 'Ocultar' : 'Mostrar'} integrantes`}
            onClick={() => setShow(!show)}
            className="grc-btn-nav"
            variant="outline"
          />
        </div>
      </div>
      <div className={`grc-body ${show ? 'show' : 'no-show'}`}>
        <section className="grc-performance">
          <Outlet />
        </section>
        {show && (
          <section className="grc-list-users">
            <div className="grc-title-list">
              <h1 className="grc-title-name">INTEGRANTES</h1>
              <Button
                text="Agregar"
                icon="plus"
                variant="outline"
                onClick={() => groupId && handleOpenCard(+groupId)}
              />
            </div>
            <div className="grc-member-table">
              <div className="grc-list-header">
                <h1 className="grc-title-member">#</h1>
                <h1 className="grc-title-member">INTEGRANTE</h1>
                {/* <h1 className="grc-title-member">USUARIO</h1> */}
                <h1 className="grc-title-member">Borrar</h1>
              </div>
              {members?.groups &&
                members.groups.map((member, index) => {
                  //mod = {miembro / invitado} = mod - true / guest - false
                  //miembro = {invitado / coordinador} = mod - false / guest - false
                  //invitado = {miembro / coordinador} = mod - false / guest - true
                  const data: Option[] = [
                    {
                      name:
                        member.mod === true
                          ? 'Hacer miembro'
                          : member.guest === false
                          ? 'Hacer invitado'
                          : 'Hacer coordinador',
                      type: 'button',
                      function: () =>
                        member.mod === true
                          ? changeMod(member.users.id, false, false)
                          : member.guest === false
                          ? changeMod(member.users.id, false, true)
                          : changeMod(member.users.id, true, false),
                    },
                    {
                      name:
                        member.mod === true
                          ? 'Hacer invitado'
                          : member.guest === true
                          ? 'Hacer miembro'
                          : 'Hacer coordinador',
                      type: 'button',
                      function: () =>
                        member.mod === true
                          ? changeMod(member.users.id, false, true)
                          : member.guest === true
                          ? changeMod(member.users.id, false, false)
                          : changeMod(member.users.id, true, false),
                    },
                  ];
                  return (
                    <div key={member?.users.id}>
                      <AppContextMenu data={data} className="grc-list-members">
                        <h1 className="grc-member-name">{index + 1}</h1>
                        <h1
                          className={`grc-member-${
                            member.mod ? 'mod' : 'name'
                          }`}
                        >
                          {member.users.profile.firstName}{' '}
                          {member.users.profile.lastName}
                        </h1>
                        {/* <span className="ule-size-pc">
                    <img src="/svg/pc-icon.svg" className="ule-icon-size" />
                    {member.users.profile.userPc ?? '---'}
                  </span> */}
                        <span className="ule-size-pc">
                          <ButtonDelete
                            icon="trash-red"
                            url={`/groups/relation/${member?.users.id}/${groupId}`}
                            className="grc-trash"
                            onSave={getUserGroup}
                          />
                        </span>
                      </AppContextMenu>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
      <CardAddGroup onSave={getUserGroup} />
    </div>
  );
};

export default GroupContent;

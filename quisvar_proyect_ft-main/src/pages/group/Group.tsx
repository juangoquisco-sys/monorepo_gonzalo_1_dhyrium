import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import './group.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { Group as GroupData } from '@/types/types';
import DivisionGroups from './components/divisionGroups/DivisionGroups';
import GroupBtnAdd from './components/groupBtnAdd/GroupBtnAdd';
import GroupListBar from './components/groupListBar/GroupListBar';
import GroupMeetingBar from './components/groupMeetingBar/GroupMeetingBar';
import Aside from '@/components/aside/Aside';
import Button from '@/components/button/Button';
import CustomSwitch from '@/components/customSwitch/CustomSwitch';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { navItemsLegacy, navItemsWorkspace } from './models/barOptions';

export const Group = () => {
  const location = useLocation();
  const isLegacyRoute = location.pathname.includes('/resumen/');
  const isMeetingWorkspaceRoute = /^\/grupos\/reuniones\/[^/]+/.test(
    location.pathname
  );
  const isOfficeWorkspaceRoute =
    location.pathname.includes('/grupos/oficinas/workspace') ||
    location.pathname.includes('/grupos/oficinas/proyectos-tecnicos');
  const [groups, setGroups] = useState<GroupData[]>();
  const [initial, setInitial] = useState<GroupData[]>();
  const [loader, setLoader] = useState<boolean>(false);
  const itemsId = useMemo(() => groups?.map(item => item.id), [groups]);
  const [activeElem, setActiveElem] = useState<GroupData | null>(null);
  const [add, setAdd] = useState<boolean>(false);
  const [changeMode, setChangeMode] = useState<boolean>(false);
  const [editOrder, setEditOrder] = useState<boolean>(false);
  const [sidebarMode, setSidebarMode] = useState<'new' | 'legacy'>(
    isLegacyRoute ? 'legacy' : 'new'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    isMeetingWorkspaceRoute || isOfficeWorkspaceRoute
  );
  const [legacyOfficesOpen, setLegacyOfficesOpen] = useState(false);

  const getgroups = useCallback(() => {
    setLoader(true);
    axiosInstance
      .get<GroupData[]>('/groups/all', {
        headers: {
          noLoader: true,
        },
      })
      .then(res => {
        setGroups(res.data);
        setInitial(res.data);
        setLoader(false);
      });
  }, []);

  useEffect(() => {
    if (changeMode) getgroups();
  }, [changeMode, getgroups]);

  useEffect(() => {
    if (isLegacyRoute) setSidebarMode('legacy');
  }, [isLegacyRoute]);

  useEffect(() => {
    if (isMeetingWorkspaceRoute || isOfficeWorkspaceRoute)
      setSidebarCollapsed(true);
  }, [isMeetingWorkspaceRoute, isOfficeWorkspaceRoute]);

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Group')
      setActiveElem(event.active.data.current.group);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeItem = active.id;
    const overItem = over.id;
    if (activeItem === overItem) return;
    setGroups(values => {
      if (!values) return [];
      const activeItemIndex = values?.findIndex(e => e.id === activeItem);
      const overItemIndex = values?.findIndex(e => e.id === overItem);
      return arrayMove(values, activeItemIndex, overItemIndex);
    });
  };

  const handleOrder = () => {
    if (groups === initial) return;
    const data = groups?.map(({ id }) => ({ id }));
    axiosInstance.put('/groups/order', data).then(() => {
      getgroups();
    });
  };

  const handleChange = () => {
    if (editOrder) {
      handleOrder();
    }
  };

  return (
    <div
      className={`gr-container ${
        sidebarCollapsed ? 'is-sidebarCollapsed' : ''
      }`}
    >
      <div className="gr-sidebarShell" aria-hidden={sidebarCollapsed}>
        <Aside>
          <div className="gr-sidebarHeader">
            <span>Modulo</span>
            <h1>Oficinas y Reuniones</h1>
          </div>

          <div
            className="gr-modeTabs"
            role="tablist"
            aria-label="Modo del modulo"
          >
            <button
              type="button"
              className={sidebarMode === 'new' ? 'is-active' : ''}
              onClick={() => setSidebarMode('new')}
            >
              <Sparkles size={15} />
              Nuevo
            </button>
            <button
              type="button"
              className={sidebarMode === 'legacy' ? 'is-active' : ''}
              onClick={() => setSidebarMode('legacy')}
            >
              <Archive size={15} />
              Legacy
            </button>
          </div>

          {sidebarMode === 'new' && (
            <section className="gr-navSection">
              <div className="gr-sectionTitle">
                <LayoutGrid size={14} />
                <span>Workspace actual</span>
              </div>
              <GroupMeetingBar itemOptions={navItemsWorkspace} />
            </section>
          )}

          {sidebarMode === 'legacy' && (
            <div className="gr-legacyPanel">
              <section className="gr-navSection">
                <div className="gr-sectionTitle is-legacy">
                  <Archive size={14} />
                  <span>Flujos anteriores</span>
                  <b>Legacy</b>
                </div>
                <GroupMeetingBar itemOptions={navItemsLegacy} />
              </section>

              <section className="gr-legacyOffices">
                <button
                  type="button"
                  className="gr-legacyToggle"
                  onClick={() => setLegacyOfficesOpen(value => !value)}
                >
                  <span>
                    {legacyOfficesOpen ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    Oficinas antiguas
                  </span>
                  <b>Legacy</b>
                </button>

                {legacyOfficesOpen && (
                  <>
                    <div className="gr-toggle-area">
                      <button
                        type="button"
                        onClick={() => setChangeMode(!changeMode)}
                        className="gr-change-option"
                      >
                        {changeMode ? 'Ver divisiones' : 'Editar grupos'}
                      </button>
                      {changeMode && !add && (
                        <CustomSwitch
                          isToggle={editOrder}
                          onToggle={handleChange}
                          onClick={() => setEditOrder(!editOrder)}
                          disabled={add}
                        />
                      )}
                    </div>

                    <div className="gr-switch-area">
                      {loader && <LoaderForComponent />}
                      {changeMode && !loader ? (
                        <>
                          <DndContext
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                          >
                            <div className="gr-drag-content">
                              <SortableContext
                                items={itemsId ? itemsId : []}
                                disabled={!editOrder}
                              >
                                {groups &&
                                  groups.map(group => (
                                    <GroupListBar
                                      group={group}
                                      key={group.id}
                                      onSave={getgroups}
                                      editOrder={editOrder}
                                    />
                                  ))}
                              </SortableContext>
                            </div>
                            {createPortal(
                              <DragOverlay>
                                {activeElem && (
                                  <GroupListBar group={activeElem} />
                                )}
                              </DragOverlay>,
                              document.body
                            )}
                          </DndContext>
                          {!add ? (
                            <Button
                              text="Agregar"
                              icon="plus"
                              variant="outline"
                              position="center"
                              onClick={() => setAdd(true)}
                              disabled={editOrder}
                            />
                          ) : (
                            <GroupBtnAdd
                              setBtnActive={() => setAdd(!add)}
                              onSave={getgroups}
                              groupLength={groups?.length}
                            />
                          )}
                        </>
                      ) : (
                        !loader && <DivisionGroups />
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </Aside>
      </div>

      <button
        type="button"
        className="gr-sidebarToggle"
        aria-label={
          sidebarCollapsed
            ? 'Mostrar menu del modulo'
            : 'Ocultar menu del modulo'
        }
        title={sidebarCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
        onClick={() => setSidebarCollapsed(value => !value)}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen size={18} />
        ) : (
          <PanelLeftClose size={18} />
        )}
      </button>

      <section className="gr-content">
        <Outlet />
      </section>
    </div>
  );
};

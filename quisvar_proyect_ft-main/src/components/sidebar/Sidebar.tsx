import './sidebar.css';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';
import {
  type MouseEvent,
  type UIEvent,
  useContext,
  useEffect,
  useState,
} from 'react';
import { loader$ } from '@/services/sharingSubject';
import { SocketContext } from '@/context/SocketContex';
import CardEditInformation from '../cardEditInformation/CardEditInformation';
import ChipItem from '../chipItem/ChipItem';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getIconDefault } from '@/utils/getIconDefault';
import { getUserSession } from '@/store/slices/userSession.slice';
import { TypeMailNoti } from '@/types/typeMailNoti';
import type { MailOption, MenuItem } from '@/types/types';
import { useQueryClient } from '@tanstack/react-query';
import useLocalStorage from '@/hooks/useLocalStorage';
import { preloadRouteChunk } from '@/routes/routePreloaders';
import { resetInitServicesCache } from '@/store/thunks/getAllInitServices..thunks';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  CircleHelp,
  ExternalLink,
  FileText,
  Info,
  LogOut,
  UserPen,
  Video,
} from 'lucide-react';

const HIDDEN_SIDEBAR_ROUTES = new Set(['rotaciones']);

const buildVisibleMenuPoints = (menuPoints: MenuItem[] = []) => {
  const hasPayrollAccess = menuPoints.some(
    item =>
      item.route === 'tramites' &&
      item.menu?.some(subMenu => subMenu.route === 'planilla')
  );

  return menuPoints
    .filter(item => !item.noView && !HIDDEN_SIDEBAR_ROUTES.has(item.route))
    .flatMap(item => {
      if (item.route !== 'tramites' || !hasPayrollAccess) return [item];
      const payrollSubMenu = item.menu?.find(
        subMenu => subMenu.route === 'planilla'
      );
      const isUserPayroll = payrollSubMenu?.typeRol === 'USER';

      const payrollItem: MenuItem = {
        ...item,
        id: -1,
        route: 'planilla',
        path: isUserPayroll ? '/planilla/mi-solicitud' : '/planilla',
        title: 'Planillas',
        menu: [],
      };

      return [item, payrollItem];
    });
};

const Sidebar = () => {
  const queryClient = useQueryClient();

  const location = useLocation();
  const { stageId, taskId } = useParams();
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [sidebarShow, setSidebarShow] = useState(false);
  const socket = useContext(SocketContext);
  const { role, profile, isSystemUser } = useSelector(
    (state: RootState) => state.userSession
  );

  useEffect(() => {
    socket.io.on('reconnect', () => {
      if (stageId) {
        const isBasic = location.pathname.includes('basicos');
        socket.emit('join', `${isBasic ? 'basic' : 'project'}-${stageId}`);
      }
      if (taskId) {
        socket.emit('join', `task-${taskId}`);
      }
      if (role) {
        socket.emit('join', `role-${role.id}`);
      }
    });
  }, []);
  useEffect(() => {
    const notificationsContainer: HTMLElement | null = document.querySelector(
      '.tox-notifications-container'
    );
    if (notificationsContainer) {
      notificationsContainer.style.display = 'none';
    }
  }, []);
  useEffect(() => {
    socket.on('server:error', (message: string) => {
      loader$.setSubject = false;
      SnackbarUtilities.error(message);
    });
    return () => {
      socket.off('server:error');
    };
  }, [socket]);

  useEffect(() => {
    if (role) {
      socket.emit('join', `role-${role.id}`);
    }
  }, [role]);

  useEffect(() => {
    socket.on('server:refresh-user', () => {
      dispatch(getUserSession());
    });
    return () => {
      socket.off('server:refresh-user');
    };
  }, [socket]);

  const [openModalInfo, setOpenModalInfo] = useState(false);
  const [openAboutModal, setOpenAboutModal] = useState(false);

  // Pendiente de habilitar cuando el flujo de notificaciones quede activo en UI.
  // const handleNotification = () => {
  //   navigate('lista-de-notificaciones');
  // };
  const goChannel = () => {
    window.open(
      'https://www.youtube.com/playlist?list=PLhad5zNNJa9qVLbdRPzOX2oMXcwcbn_ND',
      '_blank'
    );
  };
  const openManual = () => {
    window.open(
      '/tutorials/MANUAL_DE_USUARIO_ACTUALIZADO.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  };

  useEffect(() => {
    socket.on(
      'server:emit-mail-notification',
      ({ from, subject, title, mailId, typeMail }: MailOption) => {
        if (Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body: `\n${from}: \n\n${subject}`,
            icon: '/svg/dhyrium_logo_blue.svg',
          });
          notification.onclick = () => {
            window.focus();

            const navigateProcedure = (
              params: Record<string, string>,
              options?: NavigateOptions
            ) => {
              navigate(
                `tramites/tramite-de-pago/${mailId}?${new URLSearchParams(
                  params
                )}`,
                options
              );
            };

            if (typeMail === TypeMailNoti.RECEPTION_MESSAGE) {
              navigateProcedure(
                {
                  type: 'RECEPTION',
                  onHolding: 'true',
                },
                {
                  state: { isReception: true },
                }
              );
            }
            if (typeMail === TypeMailNoti.CONTINUE_MESSAGE) {
              navigateProcedure({
                type: 'RECEIVER',
              });
            }
          };
        }
      }
    );
    return () => {
      socket.off('server:emit-mail-notification');
    };
  }, [socket]);

  const logoutStorage = useLocalStorage('logout');
  useEffect(() => {
    if (logoutStorage) {
      navigate('/home');
    }
  }, [logoutStorage]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('arrChecked');
    localStorage.removeItem('officeId');
    localStorage.setItem('logout', String(Date.now()));
    resetInitServicesCache();
    // socket.emit('client:logout')
    socket.disconnect();
    navigate('login');
    queryClient.clear();
  };
  const handleHome = () => {
    navigate('/home');
  };
  const handleShowSidebar = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSidebarShow(!sidebarShow);
  };

  const openModal = () => setOpenModalInfo(true);
  const closeModal = () => setOpenModalInfo(false);
  const openAbout = () => setOpenAboutModal(true);

  useEffect(() => {
    const handleClick = () => setSidebarShow(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const userAvatar = getIconDefault(profile.dni);
  const userInitials =
    `${profile.firstName?.charAt(0) ?? ''}${
      profile.lastName?.charAt(0) ?? ''
    }`.toUpperCase() || 'US';
  const userDisplayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    'Usuario';
  const manualLabel = 'Manual de usuario';
  const preloadSystemRoute = () => preloadRouteChunk('system');

  const [offsetTop, setOffsetTop] = useState(0);
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    setOffsetTop(scrollTop);
  };
  return (
    <>
      <div className={`sidebar ${sidebarShow && 'sidebar---show'}`}>
        <nav className="nav-container ">
          <div className="nav-options">
            <figure className="sidebar-figure">
              <img
                className="nav-logo"
                src="/img/logo_img.png"
                onClick={handleHome}
                alt="logo QuisVar"
              />
            </figure>
            <div className="items-list scroll-slim" onScroll={handleScroll}>
              {buildVisibleMenuPoints(role?.menuPoints).map((item, index) => (
                <ChipItem
                  key={`${item.route}-${item.typeRol}-${item.id}-${index}`}
                  item={item}
                  offsetTop={offsetTop}
                />
              ))}
              {isSystemUser && (
                <li>
                  <NavLink
                    to="/system"
                    onFocus={preloadSystemRoute}
                    onMouseDown={preloadSystemRoute}
                    onMouseEnter={preloadSystemRoute}
                    onTouchStart={preloadSystemRoute}
                    className={({ isActive }) =>
                      isActive ? 'item-nav nav-active' : 'item-nav'
                    }
                  >
                    <span className="items-list-icon">
                      <img src="/svg/menu/auditoria.svg" alt="Sistema" />
                      <p
                        className="items-list-name"
                        style={{ transform: `translateY(-${offsetTop}px)` }}
                      >
                        Sistema
                      </p>
                    </span>
                  </NavLink>
                </li>
              )}
            </div>
          </div>
          <TooltipProvider delayDuration={150}>
            <ul className="icons-list" aria-label="Acciones de usuario">
              {/* <li className="icon-list">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="sidebar-action-button"
                      aria-label="Notificaciones"
                      onClick={handleNotification}
                    >
                      <Bell />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Notificaciones</TooltipContent>
                </Tooltip>
              </li> */}
              <li className="icon-list">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="sidebar-action-button"
                          aria-label="Ayuda"
                          onClick={event => event.stopPropagation()}
                        >
                          <CircleHelp />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">Ayuda</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="right"
                    align="end"
                    sideOffset={12}
                    className="sidebar-dropdown-content"
                  >
                    <DropdownMenuLabel>Ayuda</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={goChannel}>
                      <Video />
                      Ver video tutorial
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openManual}>
                      <FileText />
                      {manualLabel}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              <li className="icon-list">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="sidebar-avatar-button"
                          aria-label="Menu de usuario"
                          onClick={event => event.stopPropagation()}
                        >
                          <Avatar className="sidebar-avatar">
                            <AvatarImage
                              src={userAvatar}
                              alt={userDisplayName}
                              className="sidebar-avatar-image"
                            />
                            <AvatarFallback>{userInitials}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {userDisplayName}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="right"
                    align="end"
                    sideOffset={12}
                    className="sidebar-dropdown-content"
                  >
                    <DropdownMenuLabel>{userDisplayName}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openModal}>
                      <UserPen />
                      Editar perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openAbout}>
                      <Info />
                      Acerca de
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleLogout}
                    >
                      <LogOut />
                      Salir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </ul>
          </TooltipProvider>
        </nav>

        {<CardEditInformation isOpen={openModalInfo} onClose={closeModal} />}
        <Dialog open={openAboutModal} onOpenChange={setOpenAboutModal}>
          <DialogContent className="w-[min(92vw,520px)]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted p-2">
                  <img
                    src="/img/dhyrium_logo.png"
                    alt="Dhyrium"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <DialogTitle>Dhyrium</DialogTitle>
                  <DialogDescription>
                    Plataforma de gestion operativa
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm text-foreground">
              <p>
                Sistema para gestionar tareas, tramites, asistencia, proyectos,
                grupos y procesos internos segun los permisos asignados a cada
                usuario.
              </p>

              <div className="grid gap-2 rounded-md border border-border bg-muted/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Build</span>
                  <span className="font-medium text-secondary">
                    {__APP_COMMIT__}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Actualizado</span>
                  <span className="font-medium text-secondary">
                    {__APP_BUILD_DATE__}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Manual</span>
                  <span className="font-medium text-secondary">
                    Actualizado junio 2026
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={openManual}
                >
                  <FileText />
                  Manual de usuario
                  <ExternalLink data-icon="inline-end" className="ml-auto" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={goChannel}
                >
                  <Video />
                  Video tutoriales
                  <ExternalLink data-icon="inline-end" className="ml-auto" />
                </Button>
              </div>

              <p className="rounded-md border border-border bg-background p-3 text-muted-foreground">
                Si falta un modulo, una accion no aparece o encuentras un error,
                contacta al responsable interno o administrador del sistema con
                el modulo, pantalla y accion que estabas usando.
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cerrar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="sidebar-menu-open" onClick={handleShowSidebar}>
        <figure className="sidebar-menu_figure">
          <img src={`/svg/menu_default.svg`} alt="menu" />
        </figure>
      </div>
    </>
  );
};

export default Sidebar;

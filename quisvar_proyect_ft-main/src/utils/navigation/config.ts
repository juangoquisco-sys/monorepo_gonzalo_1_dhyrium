export const itemsEmployee = [
  { id: 1, title: 'Inicio', icon: 'home-bar', link: '/home' },
  { id: 2, title: 'Tramites', icon: 'ant-design_delivered', link: '/tramites' },
  {
    id: 3,
    title: 'Proyectos',
    icon: 'casco-bar',
    link: '/especialidades',
  },
];
export const itemsAsistantAdministrative = [
  ...itemsEmployee,
  {
    id: 4,
    title: 'Asistencia',
    icon: 'attendance-white',
    link: '/asistencia',
  },
];

export const itemsAdmin = [
  ...itemsAsistantAdministrative,
  { id: 5, title: 'Usuarios', icon: 'users-bar', link: '/lista-de-usuarios' },

  {
    id: 6,
    title: 'Empresas',
    icon: 'company',
    link: '/empresas',
  },
  {
    id: 7,
    title: 'Indice General',
    icon: 'generalIndex-icon',
    link: '/indice-general/contratos',
  },
  {
    id: 8,
    title: 'Oficinas y Reuniones',
    icon: 'groups',
    link: '/grupos',
  },
];

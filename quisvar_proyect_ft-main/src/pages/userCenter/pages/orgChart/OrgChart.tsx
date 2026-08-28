import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  GitBranch,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import './orgChart.css';
import Button from '@/components/button/Button';
import { Button as AppButton } from '@/components/ui/button';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import type { User } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  blockingClose,
  closeDialog,
  openDialog,
  unBlockingClose,
} from '@/utils/dialog';
import CardRegisterUser from '../users/views/cardRegisterUser/CardRegisterUser';
import type {
  OrgMembership,
  OrgMembershipForm,
  OrgUnit,
  OrgUnitForm,
  OrganizationalMembershipRole,
  OrganizationalUnitType,
} from './types';
import {
  collectDescendantIds,
  findOrgUnit,
  flattenOrgUnits,
  orgChartService,
} from './orgChart.service';
import { getOrgChartErrorMessage } from './orgChart.errors';

const UNIT_TYPES: OrganizationalUnitType[] = [
  'GERENCIA',
  'OFICINA',
  'COORDINACION',
  'GRUPO',
  'ESPECIALIDAD',
  'COMITE_TEMPORAL',
];

const MEMBERSHIP_ROLES: OrganizationalMembershipRole[] = [
  'GERENTE',
  'JEFE',
  'COORDINADOR',
  'ESPECIALISTA',
  'ASISTENTE',
  'APOYO',
];

const todayValue = () => new Date().toISOString().slice(0, 10);

const emptyUnitForm: OrgUnitForm = {
  name: '',
  codemap: '',
  type: 'OFICINA',
  parentId: '',
  isActive: true,
};

const emptyMembershipForm: OrgMembershipForm = {
  userId: '',
  role: 'ESPECIALISTA',
  positionTitle: '',
  isPrimary: false,
  startDate: todayValue(),
  endDate: '',
};

const UNIT_TYPE_LABELS: Record<OrganizationalUnitType, string> = {
  GERENCIA: 'Gerencia',
  OFICINA: 'Oficina',
  COORDINACION: 'Coordinación',
  GRUPO: 'Grupo',
  ESPECIALIDAD: 'Especialidad',
  COMITE_TEMPORAL: 'Comité temporal',
};

const labelType = (type?: OrganizationalUnitType) =>
  type ? UNIT_TYPE_LABELS[type] : '-';

const normalizeUnitName = (name?: string | null) =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');

const isGeneralRoot = (unit: OrgUnit) =>
  unit.parentId === null &&
  (unit.directoryKey === 'general' ||
    normalizeUnitName(unit.name) === normalizeUnitName('Gerente General'));

const getFullName = (user?: OrgMembership['user'] | User | null) => {
  if (!user?.profile) return 'Sin perfil';
  return `${user.profile.lastName} ${user.profile.firstName}`.trim();
};

const canonicalChildren = (unit: OrgUnit) =>
  unit.children.filter(child => child.isActive);

const getResponsibleIdentity = (unit: OrgUnit) => {
  const memberships = unit.memberships ?? [];
  const responsible =
    memberships.find(membership => membership.isUnitLead) ??
    memberships.find(membership => membership.isPrimary);
  const profile = responsible?.user.profile;
  if (!profile) return 'Vacante';
  const name = `${profile.firstName} ${profile.lastName}`
    .replace(/\s+/g, ' ')
    .trim();
  return profile.dni ? `${name} DNI: ${profile.dni}` : name;
};

const MembershipRemovalDialog = ({
  memberName,
  unitName,
  onCancel,
  onConfirm,
}: {
  memberName: string;
  unitName: string;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = async () => {
    setIsSubmitting(true);
    const completed = await onConfirm();
    if (!completed) setIsSubmitting(false);
  };

  return (
    <div className="space-y-5 text-sm text-muted-foreground">
      <p>
        ¿Desea quitar a <strong className="text-foreground">{memberName}</strong>{' '}
        de <strong className="text-foreground">{unitName}</strong>?
      </p>
      <p>
        El usuario no será eliminado del sistema. Solo finalizará su
        asignación actual en esta unidad y se conservará el historial.
      </p>
      <div className="flex justify-end gap-2">
        <AppButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </AppButton>
        <AppButton
          type="button"
          variant="destructive"
          onClick={() => void confirm()}
          disabled={isSubmitting}
        >
          <Trash2 />
          {isSubmitting ? 'Quitando…' : 'Quitar integrante'}
        </AppButton>
      </div>
    </div>
  );
};

type AtlasPosition = {
  code: string;
  name: string;
  role: string;
  officialAssignee?: string;
  children?: AtlasPosition[];
};

const ATLAS_POSITIONS: Record<string, AtlasPosition[]> = {
  '4.2': [
    { code: '4.2.1', name: 'Responsable de la Unidad y Especialista en Anteproyecto de Arquitectura', role: 'Responsable y especialista' },
    { code: '4.2.2', name: 'Especialista 1 en Estudios Topográficos, Evaluación del Riesgo de Desastres y Mecánica de Suelos', role: 'Especialista a cargo operativo' },
    { code: '4.2.3', name: 'Especialista 2 en Estudios Topográficos, Evaluación del Riesgo de Desastres y Mecánica de Suelos', role: 'Especialista a cargo operativo' },
    { code: '4.2.4', name: 'Especialista 3 en Inversiones, Diagnóstico y Demoliciones', role: 'Especialista a cargo operativo' },
  ],
  '4.3': [
    { code: '4.3.1', name: 'Responsable de la Unidad y Especialista 1 de Estudios Definitivos CAPI', role: 'Responsable y especialista' },
    { code: '4.3.2', name: 'Especialista 2 de Ingeniería', role: 'Especialista a cargo operativo' },
    { code: '4.3.3', name: 'Especialista 3 de Ingeniería', role: 'Especialista a cargo operativo' },
    { code: '4.3.4', name: 'Asistente 1 de Ingeniería', role: 'Cargo de apoyo técnico' },
  ],
  '4.4': [
    { code: '4.4.1', name: 'Responsable de la Unidad y Especialista de Arquitectura', role: 'Responsable y especialista' },
    { code: '4.4.2', name: 'Especialista en Memorias de Cálculo', role: 'Especialista a cargo operativo' },
    { code: '4.4.3', name: 'Especialista en Equipamiento, Mobiliario, Señalización y Detalles Generales', role: 'Especialista a cargo operativo' },
    { code: '4.4.4', name: 'Especialista en Plan de Contingencia', role: 'Especialista a cargo operativo' },
    { code: '4.4.5', name: 'Especialidad de Elaboración de Bloques', role: 'Especialidad con equipo dependiente', children: [
      { code: '4.4.5.1', name: 'Especialista 1 - Responsable de Elaboración de Bloques', role: 'Responsable y especialista' },
      { code: '4.4.5.2', name: 'Especialista 2 en Elaboración de Bloques', role: 'Especialista a cargo operativo' },
      { code: '4.4.5.3', name: 'Especialista 3 en Elaboración de Bloques', role: 'Especialista a cargo operativo' },
      { code: '4.4.5.4', name: 'Asistente 1 en Elaboración de Bloques', role: 'Cargo de apoyo técnico', officialAssignee: 'SHIRLEY ALEXANDRA LEONARDO GARCÍA · DNI 72208526 · pendiente de registro' },
      { code: '4.4.5.5', name: 'Asistente 2 en Elaboración de Bloques', role: 'Cargo de apoyo técnico', officialAssignee: 'ALICIA SOLEDAD LÓPEZ CASTRO · DNI 74392216 · pendiente de registro' },
      { code: '4.4.5.6', name: 'Asistente 3 en Elaboración de Bloques', role: 'Cargo de apoyo técnico' },
    ] },
    { code: '4.4.6', name: 'Especialista en Metrados y Especificaciones Técnicas', role: 'Especialidad con equipo dependiente', children: [
      { code: '4.4.6.1', name: 'Especialista Responsable de Metrados y Especificaciones Técnicas', role: 'Responsable y especialista' },
      { code: '4.4.6.2', name: 'Asistente en Metrados y Especificaciones Técnicas', role: 'Cargo de apoyo técnico' },
    ] },
    { code: '4.4.7', name: 'Especialista en Instalaciones Eléctricas, Electromecánicas, Comunicaciones y Gas', role: 'Especialista a cargo operativo' },
    { code: '4.4.8', name: 'Especialista en Instalaciones Sanitarias', role: 'Especialista a cargo operativo' },
    { code: '4.4.9', name: 'Especialista en Costos, Presupuesto y Programación', role: 'Especialista a cargo operativo' },
  ],
};

const AtlasPositionTree = ({
  positions,
  memberships,
  expanded,
  onToggle,
  onEditPosition,
}: {
  positions: AtlasPosition[];
  memberships: OrgMembership[];
  expanded: Set<string>;
  onToggle: (code: string) => void;
  onEditPosition: (position: AtlasPosition) => void;
}) => (
  <div className="orgAtlas-children">
    {positions.map(position => {
      const hasChildren = Boolean(position.children?.length);
      const isExpanded = expanded.has(position.code);
      const membership =
        memberships.find(item =>
          item.positionTitle?.trim().startsWith(`${position.code} `)
        ) ??
        (position.code.endsWith('.1')
          ? memberships.find(item =>
              item.positionTitle
                ?.trim()
                .startsWith(`${position.code.slice(0, -2)} `)
            ) ?? memberships.find(item => item.isUnitLead)
          : undefined);
      const profile = membership?.user.profile;
      const responsibleName = profile
        ? `${profile.firstName} ${profile.lastName}`.replace(/\s+/g, ' ').trim()
        : position.officialAssignee ?? 'Vacante';
      return (
        <div className="orgAtlas-treeNode" key={position.code}>
          <div className="orgAtlas-nodeLine">
            <button
              className="orgAtlas-unitCard is-position"
              type="button"
              onClick={() => onEditPosition(position)}
            >
              <span className="orgAtlas-code">{position.code}</span>
              <span className="orgAtlas-unitCopy"><strong>{position.name}</strong><small>{position.role} · {responsibleName}</small></span>
              <span className="orgAtlas-editPill">Ver y editar</span>
            </button>
            {hasChildren && (
              <button className="orgAtlas-toggle" type="button" aria-expanded={isExpanded} onClick={() => onToggle(position.code)}>
                <ChevronDown size={17} />
              </button>
            )}
          </div>
          {hasChildren && isExpanded && <AtlasPositionTree positions={position.children!} memberships={memberships} expanded={expanded} onToggle={onToggle} onEditPosition={onEditPosition} />}
        </div>
      );
    })}
  </div>
);

const OrgChart = () => {
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [unitForm, setUnitForm] = useState<OrgUnitForm>(emptyUnitForm);
  const [memberForm, setMemberForm] =
    useState<OrgMembershipForm>(emptyMembershipForm);
  const [editingUnitId, setEditingUnitId] = useState<string>();
  const [editingMemberId, setEditingMemberId] = useState<string>();
  const [selectedPosition, setSelectedPosition] = useState<AtlasPosition>();
  const [search, setSearch] = useState('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [unitFormError, setUnitFormError] = useState<string>();
  const [error, setError] = useState<string>();
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'reading' | 'overview'>(
    'reading'
  );
  const [expandedAtlasNodes, setExpandedAtlasNodes] = useState<Set<string>>(
    () => new Set()
  );
  const diagramViewportRef = useRef<HTMLDivElement>(null);

  const selectedUnit = useMemo(
    () => findOrgUnit(tree, selectedId),
    [tree, selectedId]
  );
  const visibleTree = useMemo(() => tree.filter(unit => unit.isActive), [tree]);
  const visibleUnits = useMemo(
    () => flattenOrgUnits(visibleTree),
    [visibleTree]
  );
  const activeUnits = useMemo(
    () => visibleUnits.filter(unit => unit.isActive),
    [visibleUnits]
  );
  const canonicalRoot = useMemo(
    () =>
      activeUnits.find(
        unit => unit.parentId === null && unit.directoryKey === 'general'
      ) ??
      activeUnits.find(isGeneralRoot) ??
      visibleTree.find(unit => unit.parentId === null),
    [activeUnits, visibleTree]
  );
  const canonicalRootChildren = useMemo(
    () => (canonicalRoot ? canonicalChildren(canonicalRoot) : []),
    [canonicalRoot]
  );
  const areaUnits = useMemo(
    () =>
      canonicalRootChildren.filter(
        unit => unit.type === 'COORDINACION' || unit.type === 'GERENCIA'
      ),
    [canonicalRootChildren]
  );
  const canonicalUnitCount = useMemo(
    () =>
      canonicalRoot
        ? 1 + areaUnits.length + areaUnits.reduce(
            (total, area) => total + canonicalChildren(area).length,
            0
          )
        : 0,
    [areaUnits, canonicalRoot]
  );

  const toggleAtlasNode = useCallback((code: string) => {
    setExpandedAtlasNodes(current => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const unitOptions = useMemo(() => {
    const descendants = collectDescendantIds(selectedUnit);
    return activeUnits.filter(unit => {
      if (!editingUnitId) return true;
      return unit.id !== editingUnitId && !descendants.has(unit.id);
    });
  }, [activeUnits, editingUnitId, selectedUnit]);

  const unitFormParent = useMemo(
    () => activeUnits.find(unit => unit.id === unitForm.parentId),
    [activeUnits, unitForm.parentId]
  );

  const userOptions = useMemo(() => {
    const activeUsers = users.filter(user => user.status === true);
    if (!search) return activeUsers.slice(0, 10);

    const value = search.toLowerCase();
    return activeUsers
      .filter(user => {
        const profile = user.profile;
        const fullName = `${profile?.lastName ?? ''} ${
          profile?.firstName ?? ''
        }`.toLowerCase();
        return profile?.dni?.startsWith(search) || fullName.includes(value);
      })
      .slice(0, 16);
  }, [search, users]);

  const selectedUserName = useMemo(() => {
    const user = users.find(item => String(item.id) === memberForm.userId);
    return user ? getFullName(user) : '';
  }, [memberForm.userId, users]);

  const displayedMembers = useMemo(
    () => {
      if (!selectedPosition) return members;
      if (selectedPosition.children?.length) {
        return members.filter(member =>
          member.positionTitle?.trim().startsWith(selectedPosition.code)
        );
      }
      return editingMemberId
        ? members.filter(member => member.id === editingMemberId)
        : [];
    },
    [editingMemberId, members, selectedPosition]
  );

  const getTree = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [{ roots }, userData] = await Promise.all([
        orgChartService.getTree(),
        orgChartService.getUsers(),
      ]);
      setTree(roots);
      setUsers(userData);
      setSelectedId(current => {
        if (current && findOrgUnit(roots, current)?.isActive) return current;
        return undefined;
      });
    } catch {
      setError('El modulo de organigrama aun no esta disponible.');
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreConsolidatedView = useCallback(async () => {
    setSelectedId(undefined);
    setSelectedPosition(undefined);
    setEditingUnitId(undefined);
    setEditingMemberId(undefined);
    setExpandedAtlasNodes(new Set());
    setUnitForm(emptyUnitForm);
    setMemberForm(emptyMembershipForm);
    setUnitFormOpen(false);
    setUnitFormError(undefined);
    setSearch('');
    setUserSearchOpen(false);
    setViewMode('reading');
    setZoom(100);
    await getTree();
  }, [getTree]);

  const getMembers = useCallback(async (unitId?: string) => {
    if (!unitId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    try {
      const data = await orgChartService.getMembers(unitId);
      setMembers(data.filter(membership => membership.user?.status === true));
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTreeLoad = window.setTimeout(() => {
      void getTree();
    }, 0);

    return () => window.clearTimeout(initialTreeLoad);
  }, [getTree]);

  useEffect(() => {
    const memberLoad = window.setTimeout(() => {
      void getMembers(selectedId);
    }, 0);

    return () => window.clearTimeout(memberLoad);
  }, [getMembers, selectedId]);

  const selectUnit = (unit: OrgUnit) => {
    setSelectedId(unit.id);
    setEditingUnitId(undefined);
    setEditingMemberId(undefined);
    setSelectedPosition(undefined);
    setUnitForm(emptyUnitForm);
    setUnitFormError(undefined);
    setUnitFormOpen(false);
    setMemberForm(emptyMembershipForm);
    setSearch('');
    setUserSearchOpen(false);
  };

  const startCreateRoot = () => {
    setEditingUnitId(undefined);
    setUnitForm(emptyUnitForm);
    setUnitFormError(undefined);
    setUnitFormOpen(true);
  };

  const editSelectedUnit = () => {
    if (!selectedUnit) return;
    setEditingUnitId(selectedUnit.id);
    setUnitForm({
      id: selectedUnit.id,
      name: selectedUnit.name,
      codemap: selectedUnit.codemap ?? '',
      type: selectedUnit.type,
      parentId: selectedUnit.parentId ?? '',
      isActive: selectedUnit.isActive,
    });
    setUnitFormError(undefined);
    setUnitFormOpen(true);
  };

  const submitUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!unitForm.name.trim()) return;

    setSavingUnit(true);
    setUnitFormError(undefined);
    try {
      if (editingUnitId) {
        await orgChartService.updateUnit(editingUnitId, unitForm);
        setSelectedId(editingUnitId);
      } else {
        const unit = await orgChartService.createUnit(unitForm);
        setSelectedId(unit.id);
      }
      SnackbarUtilities.success(
        editingUnitId ? 'Unidad actualizada.' : 'Unidad creada.'
      );
      setEditingUnitId(undefined);
      setUnitForm(emptyUnitForm);
      setUnitFormOpen(false);
      await getTree();
    } catch (submitError) {
      setUnitFormError(getOrgChartErrorMessage(submitError));
    } finally {
      setSavingUnit(false);
    }
  };

  const deactivateSelectedUnit = async () => {
    if (!selectedUnit || !selectedUnit.isActive) return;
    await orgChartService.deactivateUnit(selectedUnit.id);
    await getTree();
  };

  const configureMembership = (membership: OrgMembership) => {
    setEditingMemberId(membership.id);
    setMemberForm({
      id: membership.id,
      userId: String(membership.userId),
      role: membership.role,
      positionTitle: membership.positionTitle ?? '',
      isPrimary: membership.isPrimary,
      startDate: membership.startDate.slice(0, 10),
      endDate: membership.endDate ? membership.endDate.slice(0, 10) : '',
    });
    setSearch(getFullName(membership.user));
    setUserSearchOpen(false);
  };

  const selectUserForMembership = (user: User) => {
    const existingMembership = members.find(
      membership => membership.userId === user.id
    );

    if (existingMembership && !selectedPosition) {
      configureMembership(existingMembership);
      return;
    }

    setMemberForm(current => ({
      ...current,
      userId: String(user.id),
    }));
    setSearch(getFullName(user));
    setUserSearchOpen(false);
  };

  const resetMembershipForm = () => {
    setEditingMemberId(undefined);
    setMemberForm({
      ...emptyMembershipForm,
      positionTitle: selectedPosition
        ? `${selectedPosition.code} ${selectedPosition.name}`
        : '',
    });
    setSearch('');
    setUserSearchOpen(false);
  };

  const editAtlasPosition = (unit: OrgUnit, position: AtlasPosition) => {
    const memberships = unit.memberships ?? [];
    const exactMembership = memberships.find(item =>
      item.positionTitle?.trim().startsWith(`${position.code} `)
    );
    const inheritedMembership = position.code.endsWith('.1')
      ? memberships.find(item =>
          item.positionTitle
            ?.trim()
            .startsWith(`${position.code.slice(0, -2)} `)
        )
      : undefined;
    const membership = exactMembership ?? inheritedMembership;

    setSelectedId(unit.id);
    setSelectedPosition(position);
    setEditingUnitId(undefined);
    setUnitFormOpen(false);
    setUnitFormError(undefined);
    setSearch('');
    setUserSearchOpen(false);

    if (membership) {
      setEditingMemberId(membership.id);
      setMemberForm({
        id: membership.id,
        userId: String(membership.userId),
        role: membership.role,
        positionTitle:
          membership.positionTitle ?? `${position.code} ${position.name}`,
        isPrimary: membership.isPrimary,
        startDate: membership.startDate.slice(0, 10),
        endDate: membership.endDate ? membership.endDate.slice(0, 10) : '',
      });
      setSearch(getFullName(membership.user));
      return;
    }

    setEditingMemberId(undefined);
    setMemberForm({
      ...emptyMembershipForm,
      positionTitle: `${position.code} ${position.name}`,
    });
  };

  const submitMembership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit || !memberForm.userId || !memberForm.startDate) return;

    setSavingMember(true);
    try {
      const sameRoleMembership = members.find(
        membership =>
          membership.userId === Number(memberForm.userId) &&
          membership.role === memberForm.role &&
          membership.positionTitle === memberForm.positionTitle
      );
      const membershipId = editingMemberId ?? sameRoleMembership?.id;

      if (membershipId) {
        await orgChartService.updateMembership(
          membershipId,
          selectedUnit.id,
          memberForm
        );
      } else {
        await orgChartService.createMembership(selectedUnit.id, memberForm);
      }
      resetMembershipForm();
      await Promise.all([getMembers(selectedUnit.id), getTree()]);
    } finally {
      setSavingMember(false);
    }
  };

  const openUserEditor = async (membership: OrgMembership) => {
    try {
      const [user, roles, generalFiles] = await Promise.all([
        orgChartService.getUserDetail(membership.userId),
        orgChartService.getUserFormRoles(),
        orgChartService.getGeneralFiles(),
      ]);
      const dialogHandle = openDialog({
        title: 'Editar datos de usuario',
        description:
          'Los cambios se aplicarán al perfil del usuario seleccionado.',
        width: 'min(100%, 104rem)',
        children: (
          <CardRegisterUser
            embedded
            user={user}
            availableRoles={roles}
            generalFiles={generalFiles}
            onCancel={() => closeDialog()}
            onSave={() => {
              void Promise.all([getTree(), getMembers(selectedUnit?.id)]);
            }}
          />
        ),
      });

      if (!dialogHandle) {
        SnackbarUtilities.warning(
          'Cierre la ventana actual antes de editar otro integrante.'
        );
      }
    } catch {
      SnackbarUtilities.error('No se pudo cargar la ficha del usuario.');
    }
  };

  const openMembershipRemovalDialog = (membership: OrgMembership) => {
    if (!selectedUnit) return;
    const memberName = getFullName(membership.user);
    const dialogHandle = openDialog({
      title: 'Quitar integrante de la unidad',
      width: '30rem',
      children: (
        <MembershipRemovalDialog
          memberName={memberName}
          unitName={selectedUnit.name}
          onCancel={() => closeDialog()}
          onConfirm={async () => {
            blockingClose('Se está retirando al integrante.');
            try {
              await orgChartService.terminateMembership(membership.id);
              await Promise.all([getMembers(selectedUnit.id), getTree()]);
              SnackbarUtilities.success('Integrante retirado de la unidad.');
              closeDialog();
              return true;
            } catch {
              unBlockingClose();
              SnackbarUtilities.error('No se pudo retirar al integrante.');
              return false;
            }
          }}
        />
      ),
    });

    if (!dialogHandle) {
      SnackbarUtilities.warning(
        'Cierre la ventana actual antes de retirar otro integrante.'
      );
    }
  };

  const changeUnitForm = (
    field: keyof OrgUnitForm,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.target;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;
    setUnitForm(current => ({ ...current, [field]: value }));
    setUnitFormError(undefined);
  };

  const changeMemberForm = (
    field: keyof OrgMembershipForm,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.target;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;
    setMemberForm(current => ({ ...current, [field]: value }));
  };

  const centerDiagram = (behavior: ScrollBehavior = 'smooth') => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2),
      top: 0,
      behavior,
    });
  };

  const setOrganigramView = (mode: 'reading' | 'overview') => {
    setViewMode(mode);
    setZoom(mode === 'reading' ? 100 : 80);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => centerDiagram('auto'));
    });
  };

  if (loading) return <LoaderForComponent />;

  return (
    <div className="orgChart">
      {error && (
        <div className="orgChart-error">
          <Building2 size={18} />
          <span>{error}</span>
          <Button
            text="Reintentar"
            variant="outline"
            size="xxs"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void restoreConsolidatedView()}
          />
        </div>
      )}

      <section className={`orgChart-workspace${selectedUnit ? ' is-inspector-open' : ''}`}>
        <main className="orgChart-canvasPanel">
          <div className="orgChart-toolbar">
            <div>
              <h1>Organigrama</h1>
              <p>Navegacion grafica de unidades y asignaciones ERP.</p>
            </div>
            <div className="orgChart-toolbarActions">
              <div
                className="orgChart-viewModes"
                role="group"
                aria-label="Modo de visualización"
              >
                <button
                  type="button"
                  className={viewMode === 'reading' ? 'is-active' : ''}
                  onClick={() => setOrganigramView('reading')}
                >
                  Lectura
                </button>
                <button
                  type="button"
                  className={viewMode === 'overview' ? 'is-active' : ''}
                  onClick={() => setOrganigramView('overview')}
                >
                  Panorámica
                </button>
              </div>
              <div
                className="orgChart-zoomControls"
                role="group"
                aria-label="Zoom del organigrama"
              >
                <button
                  type="button"
                  aria-label="Reducir zoom"
                  title="Reducir zoom"
                  onClick={() => setZoom(current => Math.max(70, current - 10))}
                >
                  <ZoomOut size={14} />
                </button>
                <output aria-live="polite">{zoom}%</output>
                <button
                  type="button"
                  aria-label="Aumentar zoom"
                  title="Aumentar zoom"
                  onClick={() => setZoom(current => Math.min(130, current + 10))}
                >
                  <ZoomIn size={14} />
                </button>
                <button type="button" onClick={() => setZoom(90)}>
                  Ajustar
                </button>
              </div>
              <Button
                variant="outline"
                size="xxs"
                text="Centrar"
                onClick={() => centerDiagram()}
              />
              <Button
                variant="outline"
                size="xxs"
                text="Actualizar"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => void restoreConsolidatedView()}
              />
              <Button
                size="xxs"
                text="Unidad raiz"
                leftIcon={<Plus size={14} />}
                onClick={startCreateRoot}
              />
            </div>
          </div>

          <div className="orgChart-metrics">
            <div>
              <strong>{canonicalUnitCount}</strong>
              <span>unidades</span>
            </div>
            <div>
              <strong>{members.length}</strong>
              <span>miembros visibles</span>
            </div>
            <div>
              <strong>{areaUnits.length}</strong>
              <span>coordinaciones de área</span>
            </div>
          </div>

          <div
            ref={diagramViewportRef}
            className={`orgChart-diagramViewport is-${viewMode}`}
            tabIndex={0}
            aria-label="Lienzo navegable del organigrama"
          >
            {canonicalRoot ? (
              <div
                className="orgAtlas-map"
                style={{ '--org-chart-zoom': zoom / 100 } as CSSProperties}
              >
                <div className="orgAtlas-junta">
                  <strong>Junta General de Accionistas</strong>
                  <small>Gobierno superior · recibe rendición de cuentas y adopta acuerdos cuando corresponde</small>
                </div>
                <div className="orgAtlas-down" />
                <button className="orgAtlas-gerencia" type="button" onClick={() => selectUnit(canonicalRoot)}>
                  <span className="orgAtlas-gerenciaIcon"><Building2 size={26} /></span>
                  <span className="orgAtlas-gerenciaCopy">
                    <span>{canonicalRoot.codemap || 'M1'} · Gerencia General</span>
                    <strong>Gerente</strong>
                    <small>{getResponsibleIdentity(canonicalRoot)} · dirige, integra, decide, autoriza y rinde cuentas.</small>
                  </span>
                  <span className="orgAtlas-gerenciaScope"><b>{areaUnits.length} áreas</b><span>Decide · aprueba · supervisa</span></span>
                </button>
                <div className="orgAtlas-down" />

                <div className="orgAtlas-areas">
                  {areaUnits.map((area, areaIndex) => {
                    const units = canonicalChildren(area);
                    return (
                      <section className="orgAtlas-areaWrap" key={area.id}>
                        <button className={`orgAtlas-areaCard${areaIndex === 2 ? ' is-production' : ''}`} type="button" onClick={() => selectUnit(area)}>
                          <span className="orgAtlas-areaCode">{area.codemap || `M${areaIndex + 2}`} · Macrodominio operativo</span>
                          <span><strong>{area.name}</strong><small>Coordinador del {area.name}</small><span className="orgAtlas-person">{getResponsibleIdentity(area)}</span></span>
                          <span className="orgAtlas-areaFoot"><span>{units.length} unidades{areaIndex === 2 ? ' técnicas' : ''}</span><span>Ver y editar</span></span>
                        </button>
                        <div className="orgAtlas-unitTree">
                          <div className="orgAtlas-dependencies">Dependencias</div>
                          {units.map(unit => {
                            const positions = ATLAS_POSITIONS[unit.codemap ?? ''] ?? [];
                            const isExpanded = expandedAtlasNodes.has(unit.codemap ?? '');
                            return (
                              <div className="orgAtlas-treeNode" key={unit.id}>
                                <div className="orgAtlas-nodeLine">
                                  <button className="orgAtlas-unitCard" type="button" onClick={() => selectUnit(unit)}>
                                    <span className="orgAtlas-code">{unit.codemap || '—'}</span>
                                    <span className="orgAtlas-unitCopy"><strong>{unit.name}</strong><small>{areaIndex === 2 ? 'Unidad técnica bajo el Coordinador de Producción' : 'Unidad operativa dependiente'}</small><span className="orgAtlas-person">{getResponsibleIdentity(unit)}</span></span>
                                    <span className="orgAtlas-editPill">Ver y editar</span>
                                  </button>
                                  {positions.length > 0 && (
                                    <button className="orgAtlas-toggle" type="button" aria-expanded={isExpanded} onClick={() => toggleAtlasNode(unit.codemap!)}>
                                      <ChevronDown size={17} />
                                    </button>
                                  )}
                                </div>
                                {positions.length > 0 && isExpanded && <AtlasPositionTree positions={positions} memberships={unit.memberships ?? []} expanded={expandedAtlasNodes} onToggle={toggleAtlasNode} onEditPosition={position => editAtlasPosition(unit, position)} />}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="orgChart-empty">
                <GitBranch size={22} />
                <span>Sin unidades registradas</span>
              </div>
            )}
          </div>
        </main>

        {selectedUnit && <aside className="orgChart-inspector">
          <div className="orgChart-inspectorHeader">
            <div>
              <span className="orgChart-eyebrow">Unidad seleccionada</span>
              <h2>{selectedUnit?.name ?? 'Sin seleccion'}</h2>
              <p>{labelType(selectedUnit?.type)}</p>
            </div>
            {selectedUnit && (
              <span
                className={`orgChart-status ${
                  selectedUnit.isActive ? 'is-active' : 'is-inactive'
                }`}
              >
                {selectedUnit.isActive ? 'Activa' : 'Inactiva'}
              </span>
            )}
          </div>

          <div className="orgChart-inspectorActions">
            <Button
              text="Editar"
              variant="outline"
              size="xxs"
              leftIcon={<Pencil size={14} />}
              onClick={editSelectedUnit}
              disabled={!selectedUnit}
            />
            <Button
              variant="outline"
              color="danger"
              borderColor="danger"
              textColor="danger"
              size="xxs"
              text="Desactivar"
              leftIcon={<Trash2 size={14} />}
              onClick={deactivateSelectedUnit}
              disabled={!selectedUnit || !selectedUnit.isActive}
            />
          </div>

          {unitFormOpen && (
            <section className="orgChart-inspectorSection">
              <div className="orgChart-sectionTitle">
                <Info size={16} />
                <h3>
                  {editingUnitId ? 'Editar unidad' : 'Nueva unidad dependiente'}
                </h3>
              </div>

              <p className="orgChart-formContext">
                {unitFormParent
                  ? `Dependencia: ${unitFormParent.name}`
                  : 'La unidad se registrará en el nivel raíz.'}
              </p>

              {unitFormError && (
                <div
                  id="orgChart-unitFormError"
                  className="orgChart-formError"
                  role="alert"
                >
                  <Info size={15} aria-hidden="true" />
                  <span>{unitFormError}</span>
                </div>
              )}

              <form
                className="orgChart-unitForm"
                onSubmit={submitUnit}
                aria-busy={savingUnit}
              >
                <Input
                  name="unitName"
                  label="Nombre"
                  value={unitForm.name}
                  onChange={event => changeUnitForm('name', event)}
                  required
                  aria-invalid={Boolean(unitFormError)}
                  aria-describedby={
                    unitFormError ? 'orgChart-unitFormError' : undefined
                  }
                  placeholder={
                    editingUnitId ? selectedUnit?.name : 'Nueva unidad'
                  }
                />
                <Input
                  name="unitCodemap"
                  label="Codemap"
                  value={unitForm.codemap}
                  onChange={event => changeUnitForm('codemap', event)}
                  placeholder={selectedUnit?.codemap || 'Codigo interno'}
                />
                <Select
                  label="Tipo"
                  name="type"
                  data={UNIT_TYPES}
                  extractValue={type => type}
                  renderTextField={type => labelType(type)}
                  value={unitForm.type}
                  onChange={event => changeUnitForm('type', event)}
                />
                <Select
                  label="Padre"
                  name="parentId"
                  data={unitOptions}
                  extractValue={unit => unit.id}
                  renderTextField={unit =>
                    `${'--'.repeat(unit.level)} ${unit.name}`
                  }
                  value={unitForm.parentId}
                  onChange={event => changeUnitForm('parentId', event)}
                  placeholder="Raiz"
                />
                <label className="orgChart-check">
                  <input
                    type="checkbox"
                    checked={unitForm.isActive}
                    onChange={event => changeUnitForm('isActive', event)}
                  />
                  <span>Unidad activa</span>
                </label>
                <div className="orgChart-actions">
                  <Button
                    buttonType="submit"
                    text={
                      savingUnit
                        ? 'Guardando...'
                        : editingUnitId
                          ? 'Guardar unidad'
                          : 'Crear unidad'
                    }
                    leftIcon={
                      editingUnitId ? <Check size={14} /> : <Plus size={14} />
                    }
                    disabled={savingUnit || !unitForm.name.trim()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    text="Cerrar"
                    leftIcon={<X size={14} />}
                    onClick={() => {
                      setEditingUnitId(undefined);
                      setUnitForm(emptyUnitForm);
                      setUnitFormError(undefined);
                      setUnitFormOpen(false);
                    }}
                    disabled={savingUnit}
                  />
                </div>
              </form>
            </section>
          )}

          <section className="orgChart-inspectorSection">
            <div className="orgChart-sectionTitle orgChart-membersHeader">
              <div>
                <Users size={16} />
                <h3>
                  {selectedPosition?.children?.length
                    ? `Equipo ${selectedPosition.code}`
                    : selectedPosition
                      ? `Cargo ${selectedPosition.code}`
                      : 'Miembros'}
                </h3>
              </div>
            </div>

            {selectedPosition && (
              <p className="orgChart-formContext">
                Editando: {selectedPosition.name}
              </p>
            )}

            <form className="orgChart-memberForm" onSubmit={submitMembership}>
              {(!editingMemberId || selectedPosition) && (
                <div className="orgChart-userSearch">
                  <Input
                    label="Usuario"
                    value={search}
                    onFocus={() => setUserSearchOpen(true)}
                    onChange={event => {
                      setSearch(event.target.value);
                      setMemberForm(current => ({ ...current, userId: '' }));
                      setUserSearchOpen(true);
                    }}
                    placeholder="DNI o nombre"
                    leftIcon={<Search size={15} />}
                  />
                  {userSearchOpen && (
                    <div className="orgChart-userOptions">
                      {userOptions.length ? (
                        userOptions.map(user => (
                          <button
                            type="button"
                            key={user.id}
                            onClick={() => selectUserForMembership(user)}
                          >
                            <strong>{getFullName(user)}</strong>
                            <span>
                              {user.profile?.dni}
                              {members.some(member => member.userId === user.id)
                                ? ' | ya asignado'
                                : ''}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="orgChart-userOptionEmpty">
                          No se encontró un usuario activo. Regístrelo primero o busque otro DNI.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedPosition?.officialAssignee && !editingMemberId && (
                <p className="orgChart-formContext">
                  Responsable según Excel: {selectedPosition.officialAssignee}. Para guardar la asignación debe existir como usuario activo.
                </p>
              )}

              {memberForm.userId && (
                <div className="orgChart-selectedUser">
                  <UserPlus size={14} />
                  <span>
                    {editingMemberId ? 'Editando: ' : ''}
                    {selectedUserName || search}
                  </span>
                </div>
              )}

              <Select
                label="Rol"
                name="role"
                data={MEMBERSHIP_ROLES}
                extractValue={role => role}
                renderTextField={role => role}
                value={memberForm.role}
                onChange={event => changeMemberForm('role', event)}
              />
              <label className="orgChart-check">
                <input
                  type="checkbox"
                  checked={memberForm.isPrimary}
                  onChange={event => changeMemberForm('isPrimary', event)}
                />
                <span>Asignacion principal</span>
              </label>
              <div className="orgChart-actions">
                <Button
                  buttonType="submit"
                  text={editingMemberId ? 'Guardar miembro' : 'Asignar miembro'}
                  leftIcon={
                    editingMemberId ? (
                      <Check size={14} />
                    ) : (
                      <UserPlus size={14} />
                    )
                  }
                  disabled={
                    savingMember ||
                    !selectedUnit ||
                    !memberForm.userId ||
                    !memberForm.startDate
                  }
                />
                {editingMemberId && (
                  <Button
                    type="button"
                    variant="outline"
                    text="Cancelar"
                    leftIcon={<X size={14} />}
                    onClick={resetMembershipForm}
                  />
                )}
              </div>
            </form>

            <div className="orgChart-memberList">
              <div className="orgChart-memberListHeader">
                <span>Miembros asignados actualmente</span>
                <strong>{displayedMembers.length}</strong>
              </div>
              {membersLoading ? (
                <LoaderForComponent />
              ) : displayedMembers.length ? (
                displayedMembers.map(member => (
                  <div className="orgChart-memberRow" key={member.id}>
                    <div>
                      <strong>{getFullName(member.user)}</strong>
                      <span>{member.role}</span>
                    </div>
                    <div className="orgChart-rowActions">
                      {member.isUnitLead && (
                        <span className="orgChart-badge is-lead">Responsable</span>
                      )}
                      {member.isPrimary && (
                        <span className="orgChart-badge">Principal</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Editar datos de ${getFullName(member.user)}`}
                        title="Editar datos de usuario"
                        onClick={() => {
                          if (selectedPosition) {
                            configureMembership(member);
                            return;
                          }
                          void openUserEditor(member);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        aria-label={`Quitar a ${getFullName(member.user)} de la unidad`}
                        title="Quitar de la unidad"
                        onClick={() => openMembershipRemovalDialog(member)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="orgChart-empty is-small">
                  <Users size={20} />
                  <span>
                    {selectedPosition
                      ? 'Este cargo se encuentra vacante'
                      : 'No hay miembros asignados a esta unidad'}
                  </span>
                </div>
              )}
            </div>
          </section>
        </aside>}
      </section>
    </div>
  );
};

export default OrgChart;

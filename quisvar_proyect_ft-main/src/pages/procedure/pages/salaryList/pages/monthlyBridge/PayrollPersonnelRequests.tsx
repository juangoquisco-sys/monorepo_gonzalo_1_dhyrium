import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { axiosInstance } from '@/services/axiosInstance';
import { formatAmountMoneyPEN } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getPayrollUserFullName } from './payrollProfile.utils';
import './payrollMayBridge.css';

interface PersonnelOffice {
  id: string;
  name: string;
  type: string;
}

interface PersonnelUser {
  id: number;
  contract?: string[] | null;
  contractMonthlySalary?: number;
  payrollInfo?: {
    monthlySalary?: number | string | null;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    contractType?: string | null;
  } | null;
  offices?: PersonnelOffice[];
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    degree?: string;
    job?: string;
  };
  uploadTaskCount: number;
  reportCount: number;
  technicalReportCount: number;
  administrativeReportCount: number;
  paymessageCount: number;
  technicalTaskCount: number;
  administrativeTaskCount: number;
  totalAmount: number;
  paymessageId?: number | null;
  canSendToElaboration?: boolean;
  canReturnToRequests?: boolean;
  status:
    | 'REQUEST_RECEIVED'
    | 'IN_ELABORATION'
    | 'WITH_CONFORMITY'
    | 'REPORT_CREATED'
    | 'READY_TO_CREATE'
    | 'WITHOUT_UPLOADS';
}

interface PersonnelRequestsResponse {
  payrollId: number;
  totalUsers: number;
  totalUploadedTasks: number;
  totalReports: number;
  users: PersonnelUser[];
}

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toLimaBoundary = (date: string, edge: 'start' | 'end') => {
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  return `${date}T${time}-05:00`;
};

const defaultUploadStart = () => '2026-06-22';

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
};

const PayrollPersonnelRequests = () => {
  const navigate = useNavigate();
  const { salaryId } = useParams();
  const activePayrollId = Number(salaryId || 0);
  const [uploadStart, setUploadStart] = useState(defaultUploadStart);
  const [uploadEnd, setUploadEnd] = useState(dateInputValue(new Date()));
  const [userSearch, setUserSearch] = useState('');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [selectedPaymessages, setSelectedPaymessages] = useState<
    Record<number, boolean>
  >({});
  const [selectedAdministrativeUsers, setSelectedAdministrativeUsers] =
    useState<Record<number, boolean>>({});
  const [administrativeAmounts, setAdministrativeAmounts] = useState<
    Record<number, string>
  >({});

  const requestsQuery = useQuery({
    queryKey: [
      'payrollPersonnelRequests',
      activePayrollId,
      uploadStart,
      uploadEnd,
    ],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PersonnelRequestsResponse>(
        `/payrolls/${activePayrollId}/personnel-requests`,
        {
          params: {
            uploadStart: toLimaBoundary(uploadStart, 'start'),
            uploadEnd: toLimaBoundary(uploadEnd, 'end'),
          },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: Boolean(activePayrollId && uploadStart && uploadEnd),
  });

  useEffect(() => {
    const users = requestsQuery.data?.users || [];
    setAdministrativeAmounts(current => {
      const next = { ...current };
      users.forEach(user => {
        if (
          next[user.id] === undefined &&
          !user.reportCount &&
          user.status !== 'READY_TO_CREATE'
        ) {
          const contractAmount = Number(
            user.contractMonthlySalary || user.payrollInfo?.monthlySalary || 0
          );
          if (contractAmount > 0) next[user.id] = String(contractAmount);
        }
      });
      return next;
    });
  }, [requestsQuery.data?.users]);

  const searchFilteredUsers = useMemo(() => {
    const users = requestsQuery.data?.users || [];
    const search = normalizeSearch(userSearch);
    if (!search) return users;
    return users.filter(user => {
      const fullName = normalizeSearch(
        getPayrollUserFullName({ profile: user.profile })
      );
      const dni = normalizeSearch(user.profile?.dni || '');
      return fullName.includes(search) || dni.includes(search);
    });
  }, [requestsQuery.data?.users, userSearch]);

  const orgUnitOptions = useMemo(() => {
    const options = new Map<string, PersonnelOffice & { totalUsers: number }>();
    searchFilteredUsers.forEach(user => {
      const offices = user.offices?.length
        ? user.offices
        : [
            {
              id: 'without-org-unit',
              name: 'Sin unidad en organigrama',
              type: 'SIN_UNIDAD',
            },
          ];
      offices.forEach(office => {
        const current = options.get(office.id);
        if (current) {
          current.totalUsers += 1;
          return;
        }
        options.set(office.id, { ...office, totalUsers: 1 });
      });
    });
    return Array.from(options.values()).sort((first, second) =>
      first.name.localeCompare(second.name)
    );
  }, [searchFilteredUsers]);

  const groupedUsers = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; users: PersonnelUser[]; totalUploads: number }
    >();
    searchFilteredUsers.forEach(user => {
      const userOffices = user.offices?.length
        ? user.offices
        : [
            {
              id: 'without-org-unit',
              name: 'Sin unidad en organigrama',
              type: 'SIN_UNIDAD',
            },
          ];
      const offices = orgUnitId
        ? userOffices.filter(office => office.id === orgUnitId)
        : userOffices;
      offices.forEach(office => {
        let current = groups.get(office.id);
        if (!current) {
          current = {
            id: office.id,
            name: office.name,
            users: [],
            totalUploads: 0,
          };
          groups.set(office.id, current);
        }
        current.users.push(user);
        current.totalUploads += user.uploadTaskCount;
      });
    });
    return Array.from(groups.values()).sort((first, second) =>
      first.name.localeCompare(second.name)
    );
  }, [orgUnitId, searchFilteredUsers]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selectedPaymessages)
        .filter(([, selected]) => selected)
        .map(([id]) => Number(id)),
    [selectedPaymessages]
  );

  const sendMutation = useMutation({
    mutationFn: async (paymessageIds: number[]) => {
      const { data } = await axiosInstance.put(
        `/payrolls/${activePayrollId}/paymessages/send-to-elaboration`,
        { paymessageIds },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Solicitudes enviadas a elaboración');
      setSelectedPaymessages({});
      requestsQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo enviar a elaboración'),
  });

  const returnMutation = useMutation({
    mutationFn: async (paymessageIds: number[]) => {
      const { data } = await axiosInstance.put(
        `/payrolls/${activePayrollId}/paymessages/return-to-requests`,
        { paymessageIds },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Trámites regresados a solicitudes');
      setSelectedPaymessages({});
      requestsQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo regresar a solicitudes'),
  });

  const createAdministrativeMutation = useMutation({
    mutationFn: async (items: { userId: number; amount: number }[]) => {
      const { data } = await axiosInstance.post(
        `/payrolls/${activePayrollId}/personnel-requests/administrative`,
        { items },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Solicitudes administrativas creadas');
      setSelectedAdministrativeUsers({});
      requestsQuery.refetch();
    },
    onError: error =>
      SnackbarUtilities.error(
        getApiErrorMessage(
          error,
          'No se pudieron crear las solicitudes administrativas'
        )
      ),
  });

  const statusLabel = (status: PersonnelUser['status']) => {
    if (status === 'REPORT_CREATED') return 'Informe creado';
    if (status === 'REQUEST_RECEIVED') return 'Solicitud recibida';
    if (status === 'IN_ELABORATION') return 'En elaboración';
    if (status === 'WITH_CONFORMITY') return 'Con conformidad';
    if (status === 'READY_TO_CREATE') return 'Con subidas';
    return 'Sin informes';
  };

  const evidenceLabel = (user: PersonnelUser) => {
    const parts = [
      `Técnico ${user.technicalReportCount || 0}`,
      `Admin ${user.administrativeReportCount || 0}`,
    ];
    return parts.join(' · ');
  };

  const togglePaymessage = (paymessageId?: number | null) => {
    if (!paymessageId) return;
    setSelectedPaymessages(current => ({
      ...current,
      [paymessageId]: !current[paymessageId],
    }));
  };

  const createAdministrativeForUsers = (users: PersonnelUser[]) => {
    const items = users
      .filter(user => !user.reportCount && user.status !== 'READY_TO_CREATE')
      .map(user => ({
        userId: user.id,
        amount: Number(administrativeAmounts[user.id] || 0),
      }))
      .filter(item => item.amount > 0);
    if (!items.length) {
      SnackbarUtilities.warning('Ingrese montos administrativos validos');
      return;
    }
    createAdministrativeMutation.mutate(items);
  };

  const selectedAdministrativeItems = useMemo(() => {
    const users = searchFilteredUsers.filter(
      user => selectedAdministrativeUsers[user.id]
    );
    return users.filter(
      user =>
        !user.reportCount &&
        user.status !== 'READY_TO_CREATE' &&
        Number(administrativeAmounts[user.id] || 0) > 0
    );
  }, [administrativeAmounts, searchFilteredUsers, selectedAdministrativeUsers]);

  return (
    <div className="payrollMayBridge payrollPersonnelRequests">
      <header className="payrollMayBridge-header">
        <div>
          <h1>Solicitudes del personal</h1>
        </div>
        <div className="payrollMayBridge-headerActions">
          <button
            type="button"
            className="payrollPersonnelRequests-myRequest"
            onClick={() =>
              navigate('/centro-de-usuarios/planillas/mi-solicitud')
            }
          >
            Crear mi solicitud
          </button>
          <button
            type="button"
            className="payrollMayBridge-downloadZip"
            onClick={() =>
              navigate(
                `/centro-de-usuarios/planillas/${activePayrollId}/elaboracion`
              )
            }
            disabled={!activePayrollId}
          >
            Ir a elaboración
          </button>
        </div>
      </header>

      <section className="payrollMayBridge-unitFilter">
        <div className="payrollMayBridge-unitFilterText">
          <span>Unidades / oficinas</span>
          <select
            className="payrollMayBridge-unitTitleSelect"
            value={orgUnitId}
            onChange={event => setOrgUnitId(event.target.value)}
          >
            <option value="">Todas las unidades</option>
            {orgUnitOptions.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.totalUsers})
              </option>
            ))}
          </select>
          <p>
            Revisa quien tiene informes o evidencias listas antes de elaborar la
            planilla.
          </p>
        </div>
        <div className="payrollMayBridge-filters payrollPersonnelRequests-filters">
          <label>
            Subida desde
            <input
              type="date"
              value={uploadStart}
              onChange={event => setUploadStart(event.target.value)}
            />
          </label>
          <label>
            Subida hasta
            <input
              type="date"
              value={uploadEnd}
              onChange={event => setUploadEnd(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="payrollMayBridge-searchSummary">
        <label
          className="payrollMayBridge-userSearch"
          aria-label="Buscar usuario"
        >
          <FiSearch size={16} />
          <input
            type="search"
            value={userSearch}
            onChange={event => setUserSearch(event.target.value)}
            placeholder="Nombre o DNI"
          />
        </label>
      </section>

      <section className="payrollPersonnelRequests-actions">
        <span>{selectedIds.length} seleccionados</span>
        <button
          type="button"
          disabled={!selectedIds.length || sendMutation.isPending}
          onClick={() => sendMutation.mutate(selectedIds)}
        >
          Enviar seleccionados a elaboración
        </button>
        <button
          type="button"
          disabled={!selectedIds.length || returnMutation.isPending}
          onClick={() => returnMutation.mutate(selectedIds)}
        >
          Regresar seleccionados a solicitudes
        </button>
        <button
          type="button"
          disabled={
            !selectedAdministrativeItems.length ||
            createAdministrativeMutation.isPending
          }
          onClick={() =>
            createAdministrativeForUsers(selectedAdministrativeItems)
          }
        >
          Crear admin. seleccionados
        </button>
      </section>

      <section className="payrollMayBridge-summary">
        <span>{searchFilteredUsers.length} usuarios visibles</span>
        <span>
          {requestsQuery.data?.totalUploadedTasks || 0} tareas subidas
        </span>
        <span>{requestsQuery.data?.totalReports || 0} informes creados</span>
        <span>{groupedUsers.length} oficinas</span>
      </section>

      {requestsQuery.isLoading && <LoaderForComponent />}
      {!requestsQuery.isLoading && !groupedUsers.length && <TableNoData />}

      <div className="payrollMayBridge-users">
        {groupedUsers.map(group => (
          <section key={group.id} className="payrollMayBridge-officeGroup">
            <header className="payrollMayBridge-officeGroupHeader">
              <h2>{group.name}</h2>
              <span>
                {group.users.length} usuarios · {group.totalUploads} subidas
              </span>
            </header>
            {group.users.map(user => (
              <article
                key={`${group.id}-${user.id}`}
                className={`payrollPersonnelRequests-user payrollPersonnelRequests-user--${user.status}`}
              >
                <label className="payrollPersonnelRequests-select">
                  <input
                    type="checkbox"
                    disabled={!user.paymessageId}
                    checked={Boolean(
                      user.paymessageId &&
                        selectedPaymessages[user.paymessageId]
                    )}
                    onChange={() => togglePaymessage(user.paymessageId)}
                  />
                </label>
                <div className="payrollPersonnelRequests-person">
                  <strong>
                    {getPayrollUserFullName({ profile: user.profile })}
                  </strong>
                  <span>DNI {user.profile?.dni || '---'}</span>
                </div>
                <div className="payrollPersonnelRequests-phase">
                  <small>Fase actual</small>
                  <span
                    className={`payrollPersonnelRequests-status payrollPersonnelRequests-status--${user.status}`}
                  >
                    {statusLabel(user.status)}
                  </span>
                </div>
                <div className="payrollPersonnelRequests-evidence">
                  <strong>{evidenceLabel(user)}</strong>
                  <span>
                    {user.uploadTaskCount} subidas · {user.reportCount} informes
                  </span>
                </div>
                {user.reportCount ? (
                  <div className="payrollPersonnelRequests-money">
                    <span className="payrollPersonnelRequests-amount">
                      {formatAmountMoneyPEN(user.totalAmount)}
                    </span>
                    <small>Informe existente</small>
                  </div>
                ) : user.status === 'READY_TO_CREATE' ? (
                  <div className="payrollPersonnelRequests-money">
                    <span className="payrollPersonnelRequests-amount">
                      {formatAmountMoneyPEN(
                        Number(
                          user.contractMonthlySalary ||
                            user.payrollInfo?.monthlySalary ||
                            0
                        )
                      )}
                    </span>
                    <small>Pendiente técnico</small>
                  </div>
                ) : (
                  <div className="payrollPersonnelRequests-adminCreate">
                    <label title="Seleccionar para crear solicitud administrativa">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedAdministrativeUsers[user.id])}
                        onChange={event =>
                          setSelectedAdministrativeUsers(current => ({
                            ...current,
                            [user.id]: event.target.checked,
                          }))
                        }
                      />
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={administrativeAmounts[user.id] || ''}
                      onChange={event =>
                        setAdministrativeAmounts(current => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      placeholder="S/. 0.00"
                    />
                    <button
                      type="button"
                      title="Crear solicitud administrativa"
                      disabled={
                        Number(administrativeAmounts[user.id] || 0) <= 0 ||
                        createAdministrativeMutation.isPending
                      }
                      onClick={() => createAdministrativeForUsers([user])}
                    >
                      Crear admin
                    </button>
                  </div>
                )}
                <div className="payrollPersonnelRequests-rowActions">
                  <button
                    type="button"
                    disabled={!user.canSendToElaboration || !user.paymessageId}
                    onClick={() =>
                      user.paymessageId &&
                      sendMutation.mutate([user.paymessageId])
                    }
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    disabled={!user.canReturnToRequests || !user.paymessageId}
                    onClick={() =>
                      user.paymessageId &&
                      returnMutation.mutate([user.paymessageId])
                    }
                  >
                    Regresar
                  </button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};

export default PayrollPersonnelRequests;

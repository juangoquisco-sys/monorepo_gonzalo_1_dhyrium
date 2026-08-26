import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, FileUp, LoaderCircle, UserRound } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { GeneralFile, RoleForm, User } from '@/types/types';

import type { UserForm } from '../../models/types';
import CarRegisterSwornDeclaration from '../carRegisterSwornDeclaration/CarRegisterSwornDeclaration';
import CardGenerateContract from '../cardGenerateContract/CardGenerateContract';
import CardRegisterUser from '../cardRegisterUser/CardRegisterUser';
import UserDocumentsSection from './UserDocumentsSection';

type UserEditorTab = 'profile' | 'documents' | 'generation';
type UserGenerationTab = 'contract' | 'declaration';

interface UserEditWorkspaceProps {
  user: User;
  roles: RoleForm[];
  generalFiles: GeneralFile[] | null;
  onUsersRefresh?: () => void | Promise<void>;
}

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const toUserForm = (user: User): UserForm => ({
  id: user.id,
  email: user.email,
  password: '',
  confirmPassword: '',
  firstName: user.profile.firstName,
  lastName: user.profile.lastName,
  dni: user.profile.dni,
  phone: user.profile.phone,
  degree: user.profile.degree,
  address: user.address,
  department: user.profile.department,
  room: user.profile.room,
  gender: user.profile.gender,
  userPc: user.profile.userPc,
  province: user.profile.province,
  district: user.profile.district,
  roleId: user.roleId,
  ruc: user.ruc,
  job: user.profile.job,
  offices: user.offices.map(({ office }) => ({
    id: office.id,
    label: office.name,
    value: String(office.id),
  })),
  cv: null,
  firstNameRef: user.profile.firstNameRef,
  lastNameRef: user.profile.lastNameRef,
  phoneRef: user.profile.phoneRef,
  description: user.profile.description,
  addressRef: user.profile.addressRef,
  declaration: null,
  role: user.role,
  roleName: user.role?.name ?? '',
  userType: user.userType,
  payrollContractStartDate: formatDateInput(
    user.payrollInfo?.contractStartDate
  ),
  payrollContractEndDate: formatDateInput(user.payrollInfo?.contractEndDate),
  payrollMonthlySalary:
    user.payrollInfo?.monthlySalary === undefined ||
    user.payrollInfo?.monthlySalary === null
      ? ''
      : String(user.payrollInfo.monthlySalary),
  payrollContractType: user.payrollInfo?.contractType ?? 'PLANILLA',
});

const UserEditWorkspace = ({
  user,
  roles,
  generalFiles,
  onUsersRefresh,
}: UserEditWorkspaceProps) => {
  const [currentUser, setCurrentUser] = useState(user);
  const [activeTab, setActiveTab] = useState<UserEditorTab>('profile');
  const [activeGenerationTab, setActiveGenerationTab] =
    useState<UserGenerationTab>('contract');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadCurrentUser = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const response = await axiosInstance.get<User>(`/users/${user.id}`);
      setCurrentUser(response.data);
      setRefreshVersion(version => version + 1);
      return response.data;
    } catch {
      SnackbarUtilities.error('No se pudo actualizar la ficha del usuario.');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    let isCurrentRequest = true;

    const loadInitialUser = async () => {
      try {
        const response = await axiosInstance.get<User>(`/users/${user.id}`);
        if (!isCurrentRequest) return;
        setCurrentUser(response.data);
        setRefreshVersion(version => version + 1);
      } catch {
        if (!isCurrentRequest) return;
        SnackbarUtilities.error('No se pudo actualizar la ficha del usuario.');
      } finally {
        if (isCurrentRequest) setIsLoadingUser(false);
      }
    };

    void loadInitialUser();
    return () => {
      isCurrentRequest = false;
    };
  }, [user.id]);

  const handleUserRefresh = useCallback(async () => {
    await loadCurrentUser();
    await onUsersRefresh?.();
  }, [loadCurrentUser, onUsersRefresh]);

  const swornDeclarationUserData = useMemo(
    () => toUserForm(currentUser),
    [currentUser]
  );

  if (isLoadingUser) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        Cargando la ficha completa del usuario…
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={value => setActiveTab(value as UserEditorTab)}
      className="min-w-0 gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {currentUser.profile.firstName} {currentUser.profile.lastName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            DNI {currentUser.profile.dni}
          </p>
        </div>
        {isRefreshing && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            Actualizando
          </span>
        )}
      </div>

      <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-muted p-1">
        <TabsTrigger value="profile" className="shrink-0 gap-2">
          <UserRound aria-hidden="true" className="size-4" />
          Ficha del usuario
        </TabsTrigger>
        <TabsTrigger value="documents" className="shrink-0 gap-2">
          <FileText aria-hidden="true" className="size-4" />
          Expediente
        </TabsTrigger>
        <TabsTrigger value="generation" className="shrink-0 gap-2">
          <FileUp aria-hidden="true" className="size-4" />
          Generar documento
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="profile"
        forceMount
        className="mt-0 data-[state=inactive]:hidden"
      >
        <CardRegisterUser
          embedded
          compact
          user={currentUser}
          availableRoles={roles}
          generalFiles={generalFiles}
          closeAfterSave={false}
          showSwornDeclaration={false}
          onSave={handleUserRefresh}
        />
      </TabsContent>

      <TabsContent
        value="documents"
        forceMount
        className="mt-0 data-[state=inactive]:hidden"
      >
        <UserDocumentsSection
          user={currentUser}
          onUserRefresh={handleUserRefresh}
        />
      </TabsContent>

      <TabsContent
        value="generation"
        forceMount
        className="mt-0 data-[state=inactive]:hidden"
      >
        <Tabs
          value={activeGenerationTab}
          onValueChange={value =>
            setActiveGenerationTab(value as UserGenerationTab)
          }
          className="gap-4"
        >
          <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto border border-border bg-background p-1">
            <TabsTrigger value="contract" className="shrink-0 gap-2">
              <FileUp aria-hidden="true" className="size-4" />
              Contrato
            </TabsTrigger>
            <TabsTrigger value="declaration" className="shrink-0 gap-2">
              <FileText aria-hidden="true" className="size-4" />
              Declaración jurada
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="contract"
            forceMount
            className="mt-0 w-full min-w-0 data-[state=inactive]:hidden"
          >
            <CardGenerateContract
              key={`contract-${currentUser.id}-${refreshVersion}`}
              user={currentUser}
              onSave={handleUserRefresh}
              embedded
            />
          </TabsContent>

          <TabsContent
            value="declaration"
            forceMount
            className="mt-0 w-full min-w-0 data-[state=inactive]:hidden"
          >
            <CarRegisterSwornDeclaration
              key={`declaration-${currentUser.id}-${refreshVersion}`}
              embedded
              generalFiles={generalFiles}
              userData={swornDeclarationUserData}
              roles={roles}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
};

export default UserEditWorkspace;

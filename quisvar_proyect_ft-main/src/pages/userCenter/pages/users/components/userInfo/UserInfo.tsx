import type { RoleForm, User } from '@/types/types';
import './userinfo.css';
import { useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { getIconDefault } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import Button from '@/components/button/Button';
import {
  isOpenCardRegisterUser$,
  isOpenViewDocs$,
} from '@/services/sharingSubject';

interface UserInfoProps {
  user: User;
  index: number;
  onPrint?: () => void;
  roles: RoleForm[];
  onUserUpdated?: () => void | Promise<void>;
}

type PayrollViewState =
  | 'complete'
  | 'incomplete'
  | 'missing'
  | 'expired'
  | 'expiring';

const getPayrollViewState = (user: User): PayrollViewState => {
  const payroll = user.payrollInfo;
  if (!payroll) return 'missing';

  const hasStartDate = Boolean(payroll.contractStartDate);
  const hasSalary = Number(payroll.monthlySalary ?? 0) > 0;
  const hasContractType = Boolean(payroll.contractType);
  const endDate = payroll.contractEndDate
    ? new Date(payroll.contractEndDate)
    : null;

  if (endDate && !Number.isNaN(endDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + 30);

    if (endDate < today) return 'expired';
    if (endDate <= warningDate) return 'expiring';
  }

  if (hasStartDate && hasSalary && hasContractType) return 'complete';
  return 'incomplete';
};

const PAYROLL_STATE_TEXT: Record<PayrollViewState, string> = {
  complete: 'Completo',
  incomplete: 'Incompleto',
  missing: 'Sin datos',
  expired: 'Vencido',
  expiring: 'Por vencer',
};

const UserInfo = ({
  user,
  index,
  onPrint,
  roles,
  onUserUpdated,
}: UserInfoProps) => {
  const [isOn, setIsOn] = useState(user.status);
  // const [openRole, setOpenRole] = useState(false);
  const { id: userSessionId } = useSelector(
    (state: RootState) => state.userSession
  );
  const { profile } = user;

  const handleViewDocs = () => {
    isOpenViewDocs$.setSubject = { isOpen: true, user };
  };

  const sendInfo = () => {
    const { firstName, lastName } = user.profile;
    SnackbarUtilities.info(
      `Usuario ${firstName} ${lastName} ${isOn ? 'archivado' : 'activado'}`
    );
  };
  const handleChangeStatus = () => {
    const _data = { status: !isOn, id: user.id };
    axiosInstance.patch(`users/${user.id}`, _data).then(() => {
      setIsOn(!isOn);
      Promise.resolve(onUserUpdated?.()).then(sendInfo);
    });
    axiosInstance.patch(`/attendanceGroup/disabled/${user.id}`, {
      status: !isOn,
    });
  };
  // console.log(handleChangeStatus);
  // const handleChangeRole = async ({
  //   target,
  // }: React.ChangeEvent<HTMLSelectElement>) => {
  //   const idRole = +target.value;
  //   const _dataRole = { role, id: user.id };
  //   setOpenRole(false);
  //   await axiosInstance.patch(`users/${user.id}`, _dataRole).then(getUsers);
  // };
  // const roleLimit = verifyByRole(user.role, userSession.role);

  const editUser = () => {
    isOpenCardRegisterUser$.setSubject = { isOpen: true, user, roles };
  };
  const payrollState = getPayrollViewState(user);

  return (
    <div className="user-container header-grid-row">
      <div className="col-span  email-container ">
        <span className="user-index">{index + 1}</span>
        <figure className="user-profile-figure">
          <img src={getIconDefault(user.profile.dni)} alt={user.email} />
        </figure>

        <div className="user-details">
          <h4>{profile.dni} </h4>
          <p>
            {profile.lastName} {profile.firstName}
          </p>
        </div>
      </div>
      <div className="col-span role-container">
        {/* {roles && openRole ? (
          <Select
            defaultValue={user.role?.id}
            className="role-options"
            onChange={handleChangeRole}
            name="role"
            itemKey="id"
            textField="name"
            data={roles}
          />
        ) : ( */}
        <span className="role-title">{user.role?.name}</span>
        {/* )} */}
        {/* {roleLimit && ( */}
        {/* <Button
          icon={openRole ? 'close' : 'pencil'}
          className="role-btn"
          type="button"
          onClick={() => {
            setOpenRole(!openRole);
          }}
        /> */}
        {/* )} */}
      </div>
      <div className="col-span job-container">{profile.job.label}</div>
      <div className="col-span phone-container">{profile.phone}</div>
      <div className="col-span">
        <span className={`payroll-status-chip is-${payrollState}`}>
          {PAYROLL_STATE_TEXT[payrollState]}
        </span>
      </div>
      <div className="col-span">
        {user.id !== userSessionId && (
          <div
            className="switch-status"
            data-ison={isOn}
            onClick={handleChangeStatus}
          >
            <div className={`handle-statuts ${isOn && 'handle-on'}`}></div>
          </div>
        )}
      </div>
      <div className="col-span">
        <Button
          className="role-btn"
          icon="folder-icon"
          onClick={handleViewDocs}
          variant="ghost"
        />
      </div>
      <div className="col-span actions-container">
        {/* {roleLimit && ( */}
        <>
          <Button
            icon="pencil"
            className="role-btn-big"
            onClick={editUser}
            variant="ghost"
          />
        </>
        {/* )} */}
      </div>
      <div className="col-span">
        <Button
          className="role-btn-big"
          icon="print-report"
          onClick={onPrint}
          variant="ghost"
        />
      </div>
    </div>
  );
};

export default UserInfo;

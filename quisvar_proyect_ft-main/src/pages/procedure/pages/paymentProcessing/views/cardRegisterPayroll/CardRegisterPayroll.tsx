import { useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import Modal from '@/components/portal/Modal';
import { isOpenCardRegisterPayroll$ } from '@/services/sharingSubject';
import SalarySidebarItem from '../../../salaryList/components/salarySidebarItem/SalarySidebarItem';
import SalarySidebarItemCreated from '../../../salaryList/components/salarySidebarItem/SalarySidebarItemCreated';
import usePayrollList from '../../../../hooks/usePayrollList';
import { useNavigate } from 'react-router-dom';
import useModalSubscription from '@/hooks/useModalSubscription';
import './cardRegisterPayroll.css';
import { axiosInstance } from '@/services/axiosInstance';
import { FiPlus } from 'react-icons/fi';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
const CardRegisterPayroll = () => {
  const navigate = useNavigate();
  const {
    usePayrollListQuery,
    newPad,
    handleFinish,
    handleNewSalary,
    newSalary,
  } = usePayrollList({ status: true });
  const [messageIds, setMessageIds] = useState<number[]>([]);

  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardRegisterPayroll$,
    ({ ids }) => {
      setMessageIds(ids);
    }
  );

  const handleNavigatePayroll = async (payrollId: number) => {
    const ids = messageIds.map(id => ({ id }));
    const body = {
      ids,
    };
    await axiosInstance.post(`/payrolls/add-report/${payrollId}`, body);
    SnackbarUtilities.success(
      'Trámites registrados correctamente en la planilla'
    );
    navigate(`/planilla/${payrollId}`);
  };

  return (
    <Modal size={30} isOpenProp={isOpenModal}>
      <div className="cardRegisterPayroll">
        <CloseIcon onClick={onCloseModal} right={0.5} top={0.5} />
        <h2 className="cardRegisterPayroll-title">
          Registrando{' '}
          <span className="cardRegisterPayroll-title-number ">
            {messageIds.length}
          </span>{' '}
          trámites en planilla
        </h2>
        {newSalary && (
          <SalarySidebarItemCreated
            handleClose={handleNewSalary}
            initValue={newPad}
            onSave={handleFinish}
          />
        )}
        {usePayrollListQuery.isFetching && <LoaderOnly left={2} />}
        <div className="cardRegisterPayroll-items scroll-slim">
          {usePayrollListQuery.data?.map(salary => (
            <SalarySidebarItem
              key={salary.id}
              salary={salary}
              handleNavigate={() => handleNavigatePayroll(salary.id)}
            />
          ))}
        </div>
        <Button
          text="Nueva planilla"
          leftIcon={<FiPlus size={21} />}
          textColor="dark"
          color="lightPrimary"
          borderRadius={10}
          paddingInline={1.3}
          onClick={handleNewSalary}
          disabled={usePayrollListQuery.isFetching}
          position="right"
        />
      </div>
    </Modal>
  );
};

export default CardRegisterPayroll;

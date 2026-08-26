import { useContext, useEffect, useState } from 'react';
import { PiLockKeyOpenFill, PiLockKeyFill } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import { PayrollContext } from '../../context/payrollContext';

const PayrollLock = () => {
  const { abortRequest, axiosAbortable } = useAbortableAxios();
  const [isOpenPayroll, setIsOpenPayroll] = useState(false);

  const { salary, payrollQuery } = useContext(PayrollContext);

  useEffect(() => {
    setIsOpenPayroll(!!salary?.status);
  }, [salary?.status]);

  const TypeIcon = isOpenPayroll ? PiLockKeyOpenFill : PiLockKeyFill;
  const handleClick = async () => {
    abortRequest();
    setIsOpenPayroll(!isOpenPayroll);
    await axiosAbortable.patch(`payrolls/change-status/${salary?.id}`, {
      status: !isOpenPayroll,
    });
    payrollQuery.refetch();
  };

  return (
    <TypeIcon
      cursor={'pointer'}
      color={isOpenPayroll ? COLOR_CSS.success : COLOR_CSS.danger}
      size={21}
      onClick={handleClick}
    />
  );
};

export default PayrollLock;

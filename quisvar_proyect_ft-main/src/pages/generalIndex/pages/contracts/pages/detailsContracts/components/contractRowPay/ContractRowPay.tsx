import type { FocusEvent } from 'react';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import type { PayData } from '../../models/type';
import './contractRowPay.css';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';

interface ContractRowPayProps {
  payData: PayData;
  addPay: (data: PayData) => void;
  deletePay: (id: string) => void;
  index: number;
}

const ContractRowPay = ({
  addPay,
  deletePay,
  index,
  payData,
}: ContractRowPayProps) => {
  const contract = useSelector((state: RootState) => state.contract);

  const handleBlur = (
    e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const values = {
      ...payData,
      [name]: value,
    };
    if (name === 'percentage') {
      values.amount = (+value / 100) * (contract?.amount ?? 0);
    }
    addPay(values);
  };
  const handleDelete = () => {
    deletePay(payData.id);
  };
  return (
    <div className="contractRowPay-row">
      <IconAction
        icon="trash-red"
        size={0.8}
        right={0}
        top={0.1}
        className="contractRowPhase-close"
        onClick={handleDelete}
        zIndex={2}
      />
      <span className="contractRowPhase-text">C. Pago: {index}</span>
      <Input
        type="text"
        styleInput={3}
        placeholder="nombre"
        name="name"
        defaultValue={payData.name}
        onBlur={handleBlur}
      />
      <textarea
        name="description"
        placeholder="descripcion"
        rows={3}
        className="input-main-style-2_1"
        style={{ resize: 'vertical' }}
        defaultValue={payData.description}
        onBlur={handleBlur}
      />
      <div className="contractRowPay-input-percentage">
        <Input
          type="text"
          placeholder="0%"
          name="percentage"
          styleInput={3}
          defaultValue={payData.percentage}
          onBlur={handleBlur}
        />
        <span className="contractRowPhase-text">%</span>
      </div>
      <Input
        type="text"
        styleInput={3}
        name="amount"
        placeholder="Monto"
        value={payData.amount}
        disabled
        onBlur={handleBlur}
      />
    </div>
  );
};

export default ContractRowPay;

import { useState, type FocusEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './contractRowPhase.css';
import { INIT_VALUES_PAY } from '../../models/definitions';
import type { PayData, PhaseData } from '../../models/type';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import ContractRowPay from '../contractRowPay/ContractRowPay';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { ContractIndexData } from '@/types/types';

interface ContractRowPhaseProps {
  phaseData: PhaseData;
  addPhase: (data: PhaseData, type: keyof PhaseData) => void;
  deletePhase: (id: string) => void;
  index: number;
  contractIndex: ContractIndexData[];
}

const ContractRowPhase = ({
  phaseData,
  addPhase,
  deletePhase,
  index,
  contractIndex,
}: ContractRowPhaseProps) => {
  const [paysData, setPaysData] = useState<PayData[]>(phaseData.payData ?? []);

  const addPay = (pay: PayData) => {
    const updatePhase = paysData.map(payData => {
      if (payData.id === pay.id) return pay;
      return payData;
    });
    setPaysData(updatePhase);
    addPhase({ ...phaseData, payData: updatePhase }, 'payData');
  };
  const deletePay = (id: string) => {
    const payLevel = contractIndex[1]?.nextLevel?.[0]?.nextLevel;
    const findPayLevel = payLevel?.find(pay => pay.deliverLettersId === id);
    if (findPayLevel?.hasFile === 'yes')
      return SnackbarUtilities.error('Asegurese de borrar el archivo antes.');
    const newPays = paysData.filter(pay => pay.id !== id);
    setPaysData(newPays);
    addPhase({ ...phaseData, payData: newPays }, 'payData');
  };
  const addNewInput = () => {
    const newPay = [...paysData, { ...INIT_VALUES_PAY, id: uuidv4() }];
    setPaysData(newPay);
  };
  const handleBlur = (
    e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'days') {
      // console.log(phaseData);
    }
    const values = {
      ...phaseData,
      [name]: name === 'isActive' ? value === 'on' : value,
    };
    addPhase(values, name as keyof PhaseData);
  };
  const handleDelete = () => {
    deletePhase(phaseData.id);
  };
  return (
    <>
      <div className="detailsContracts-phase-ejecution-row contractRowPhase-row">
        <IconAction
          icon="trash-red"
          size={0.8}
          right={0}
          top={0.5}
          className="contractRowPhase-close"
          onClick={handleDelete}
        />
        <span className="contractRowPhase-text">
          <img
            src="/svg/down.svg"
            className={`contractRowPhase-dropdown-arrow `}
          />
          {index}
          <input
            type="checkbox"
            className="contractRowPhase-dropdown-check"
            defaultChecked={false}
          />
        </span>
        <Input
          type="text"
          styleInput={3}
          name="name"
          defaultValue={phaseData.name}
          onBlur={handleBlur}
        />
        <textarea
          name="description"
          rows={3}
          className="input-main-style-2_1"
          style={{ resize: 'vertical' }}
          defaultValue={phaseData.description}
          onBlur={handleBlur}
        />
        <div className="contractRowPhase-input-day">
          <Input
            type="text"
            name="days"
            styleInput={3}
            defaultValue={phaseData.days}
            onBlur={handleBlur}
          />
          <span className="contractRowPhase-text">dias</span>
        </div>
      </div>
      <div className="contractRowPhase-dropdown-content">
        <ul className="contractRowPhase-dropdown-sub">
          {paysData.map((payData, i) => (
            <ContractRowPay
              key={payData.id}
              addPay={addPay}
              deletePay={deletePay}
              payData={payData}
              index={i + 1}
            />
          ))}
          <span
            onClick={addNewInput}
            className="detailsContracts-add-span detailsContracts-add-span-color-2"
          >
            Añadir nuevo pago
          </span>
        </ul>
      </div>
    </>
  );
};

export default ContractRowPhase;

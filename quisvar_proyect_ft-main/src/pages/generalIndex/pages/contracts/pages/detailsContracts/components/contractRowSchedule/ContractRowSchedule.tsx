import type { CSSProperties } from 'react';
import './contractRowSchedule.css';
import type { PayData } from '../../models/type';

interface ContractRowScheduleProps {
  data: {
    [key: string]: {
      value: string;
      fr: string;
    };
  };
  isHeader?: boolean;
  extraData?: PayData[];
  hasBorder?: boolean;
  statusPhase?: () => string;
  hasFileInPay?: (id: string) => boolean;
}
const ContractRowSchedule = ({
  data,
  isHeader = false,
  extraData,
  hasBorder = true,
  statusPhase,
  hasFileInPay,
}: ContractRowScheduleProps) => {
  const frs = Object.values(data)
    .map(({ fr }) => fr)
    .join(' ');
  const style: CSSProperties = {
    gridTemplateColumns: frs,
    borderTop: hasBorder ? ' 1px solid #dce4f1' : '',
    color: statusPhase?.(),
  };
  return (
    <div className="contractRowSchedule">
      <div className="detailsContracts-row-schedule" style={style}>
        {Object.values(data).map(({ value }) => (
          <span
            key={value}
            className={`${
              isHeader
                ? 'contractRowSchedule-text-title'
                : 'contractRowSchedule-text-subtitle'
            }`}
          >
            {value}
          </span>
        ))}
      </div>
      {extraData && extraData.length > 0 && (
        <div className="detailsContracts-row-extra">
          <ContractRowSchedule
            data={{
              1: { value: `Carta`, fr: '1fr' },
              2: { value: 'Descripcion', fr: '2fr' },
              3: { value: `Porcentaje`, fr: '1fr' },
              4: { value: 'Precio', fr: '1fr' },
              5: { value: 'Archivo', fr: '1fr' },
            }}
            isHeader
          />
          {extraData?.map(({ amount, description, percentage, id }, i) => (
            <ContractRowSchedule
              key={id}
              data={{
                1: { value: `C.P. ${i + 1}`, fr: '1fr' },
                2: { value: description, fr: '2fr' },
                3: { value: `${percentage}% `, fr: '1fr' },
                4: { value: String(amount), fr: '1fr' },
                5: { value: hasFileInPay?.(id) ? '✅' : '🛑', fr: '1fr' },
              }}
              hasBorder={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractRowSchedule;

import SelectReact from 'react-select';
import type { SingleValue } from 'react-select';
import type { OptionSelect } from '@/types/option.types';
import './procedureSelectOffice.css';
import {
  ControlProcedureSelect,
  OptionProcedureSelect,
} from '@/components/select/optionComponents/optionProcedureSelect/OptionProcedureSelect';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { useSearchParams } from 'react-router-dom';
import { getFullNameShort } from '@/utils/tools';
import useRole from '@/hooks/useRole';
// interface ProcedureSelectOfficeProps {
//   options: OptionSelect[];
// }

interface ProcedureSelectOfficeProps {
  officeId: number | null;
  onChange: (value: number | null) => void;
}
const ProcedureSelectOffice = ({
  officeId,
  onChange,
}: ProcedureSelectOfficeProps) => {
  const { hasAccess } = useRole('MOD', 'tramites', 'tramite-de-pago');

  const userSession = useSelector((state: RootState) => state.userSession);
  const { offices } = userSession;
  const officesTransform = offices.map(({ office, officeId }) => ({
    id: officeId,
    value: String(officeId),
    label: office.name,
  }));
  const [searchParams] = useSearchParams();

  const officesSelect: OptionSelect[] = [
    { id: 0, value: '0', label: getFullNameShort(userSession) },
    ...officesTransform,
  ];

  const handleSelectOption = (data: SingleValue<OptionSelect>) => {
    if (data?.id) {
      onChange(data.id);
      localStorage.setItem('officeId', String(data?.value));
    } else {
      onChange(null);
      localStorage.removeItem('officeId');
    }
  };

  const type = searchParams.get('type') ?? '';

  if (!hasAccess || type === 'RECEPTION') return <></>;
  return (
    <div className="procedureSelectOffice">
      <SelectReact
        options={officesSelect}
        components={{
          Option: OptionProcedureSelect,
          Control: ControlProcedureSelect,
        }}
        defaultValue={officesSelect[0]}
        value={
          officesSelect.find(({ value }) => value === String(officeId)) ||
          officesSelect[0]
        }
        onChange={handleSelectOption}
        placeholder="Sin asignar..."
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            borderColor: 'transparent',
            fontSize: '0.875rem',
            fontWeight: '500',
            paddingLeft: 10,
            backgroundColor: state.isDisabled
              ? 'white'
              : baseStyles.backgroundColor,
          }),
          singleValue: (provided, state) => ({
            ...provided,
            color: state.isDisabled ? 'black' : provided.color,
            fontSize: ' 0.875rem',
            fontWeight: '400',
            lineHeight: '150%',
            letterSpacing: '0.01313rem',
          }),
          indicatorsContainer: (provided, state) => ({
            ...provided,
            display: state.isDisabled ? 'none' : provided.display,
          }),
          placeholder: provided => ({
            ...provided,
            fontSize: '0.8rem',
            fontWeight: '500',
          }),
        }}
      />
    </div>
  );
};

export default ProcedureSelectOffice;

import SelectReact from 'react-select';
import type { SingleValue } from 'react-select';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import {
  ControlProcedureSelect,
  OptionProcedureSelect,
} from '@/components/select/optionComponents/optionProcedureSelect/OptionProcedureSelect';
import type { OptionSelect } from '@/types/option.types';
import './personalSelectOffices.css';
import { useEffect, useState } from 'react';
interface PersonalSelectOfficeProps {
  onChange?: (data: OptionSelect) => void;
  isRelative?: boolean;
  defaultOfficeName?: string;
}
const normalizeOfficeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const PersonalSelectOffice = ({
  onChange,
  isRelative = false,
  defaultOfficeName,
}: PersonalSelectOfficeProps) => {
  const { offices } = useSelector((state: RootState) => state.userSession);
  const officesSelect: OptionSelect[] = offices.map(({ office, officeId }) => ({
    id: officeId,
    value: String(officeId),
    label: office.name,
  }));
  const defaultOffice =
    officesSelect.find(office =>
      defaultOfficeName
        ? normalizeOfficeName(office.label).includes(
            normalizeOfficeName(defaultOfficeName)
          )
        : false
    ) || officesSelect[0];
  const [selectedOffice, setSelectedOffice] = useState<OptionSelect | null>(
    null
  );
  useEffect(() => {
    if (!defaultOffice) return;
    setSelectedOffice(defaultOffice);
    onChange?.(defaultOffice);
  }, [defaultOffice?.id]);
  const handleSelectOption = (data: SingleValue<OptionSelect>) => {
    if (data?.id) {
      setSelectedOffice(data);
      onChange?.(data);
    }
  };
  return (
    <div
      className={`personalSelectOffice ${
        isRelative && 'personalSelectOffice-relative'
      }`}
    >
      <SelectReact
        options={officesSelect}
        components={{
          Option: el => OptionProcedureSelect({ ...el, isSmall: true }),
          Control: el => ControlProcedureSelect({ ...el, isSmall: true }),
        }}
        value={selectedOffice || defaultOffice}
        onChange={handleSelectOption}
        placeholder="Sin asignar..."
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            borderColor: 'transparent',
            paddingLeft: 10,
            backgroundColor: state.isDisabled
              ? 'white'
              : baseStyles.backgroundColor,
          }),
          singleValue: (provided, state) => ({
            ...provided,
            color: state.isDisabled ? 'black' : provided.color,
            fontSize: ' 0.6rem',
            fontWeight: '400',
            lineHeight: '150%',
            letterSpacing: '0.01313rem',
            width: '7.5rem',
          }),
          option: provided => ({
            ...provided,
            paddingTop: 2,
            paddingBottom: 2,
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

export default PersonalSelectOffice;

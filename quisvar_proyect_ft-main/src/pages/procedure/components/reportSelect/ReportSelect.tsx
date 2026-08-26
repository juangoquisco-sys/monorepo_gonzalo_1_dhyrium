import { components } from 'react-select';
import type { MultiValue, PlaceholderProps } from 'react-select';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import IconAction from '@/components/iconAction/IconAction';
import type { Report } from '../../../listPersonalReports/interface/report.types';
import './reportSelect.css';
import useReportSelf from '@/hooks/useReportSelf';
import type { FieldErrors, FieldValues, Path } from 'react-hook-form';

const Placeholder = (props: PlaceholderProps<Report, true>) => {
  return (
    <components.Placeholder {...props}>
      <div className="reportSelect-placeholder">
        <IconAction icon="clip-icon" position="none" />
        <span>Adjuntar reporte</span>
      </div>
    </components.Placeholder>
  );
};

interface ReportSelectProps<FormData extends FieldValues> {
  onChange?: (option: MultiValue<Report>) => void;
  name: Path<FormData>;
  errors?: FieldErrors<FormData>;
}

const ReportSelect = <FormData extends FieldValues>({
  onChange,
  name,
  errors,
}: ReportSelectProps<FormData>) => {
  const { reportSelfQuery } = useReportSelf('no');
  const handleSelectOption = (option: MultiValue<Report>) => {
    onChange?.(option!);
  };

  return (
    <div className="reportSelect">
      <AdvancedSelect
        options={reportSelfQuery.data}
        isLoading={reportSelfQuery.isFetching}
        components={{ Placeholder }}
        onChange={handleSelectOption}
        placeholder="Seleccionar reporte"
        name={name}
        errors={errors}
        isMulti
      />
    </div>
  );
};

export default ReportSelect;

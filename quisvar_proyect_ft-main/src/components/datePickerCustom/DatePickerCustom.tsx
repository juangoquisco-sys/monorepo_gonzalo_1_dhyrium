import DatePicker, { registerLocale } from 'react-datepicker';
import type { DatePickerProps } from 'react-datepicker';
import './datePickerCustom.css';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
registerLocale('es', es);

type DatePickerCustomProps = DatePickerProps & {
  fullWidth?: boolean;
};
const DatePickerCustom = (props: DatePickerCustomProps) => {
  const { wrapperClassName, calendarIconClassName, fullWidth, ...rest } = props;
  return (
    <DatePicker
      wrapperClassName={`datePickerCustom-calendar ${wrapperClassName} ${
        fullWidth && 'datePickerCustom-full-width'
      }`}
      calendarIconClassName={`datePickerCustom-calendar-icon ${calendarIconClassName} `}
      clearButtonClassName="datePickerCustom-clear-btn"
      locale="es"
      dateFormat="dd/MM/yyyy"
      popperClassName="datePickerCustom-calendar-popper"
      {...rest}
    />
  );
};

export default DatePickerCustom;

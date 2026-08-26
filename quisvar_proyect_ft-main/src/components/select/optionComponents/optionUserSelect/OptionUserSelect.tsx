import { components, type ControlProps, type OptionProps } from 'react-select';
import './optionUserSelect.css';
import IconProfile from '../../../iconProfile/IconProfile';
import type { OptionUserExtend } from '@/types/types';

export const OptionUserSelect = <T extends OptionUserExtend>(
  props: OptionProps<T, false>
) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div className="optionUserSelect">
        <IconProfile dni={data.dni} />
        <span className="optionUserSelect-span">{data.label}</span>
      </div>
    </components.Option>
  );
};

export const ControlUser = <T extends OptionUserExtend>(
  props: ControlProps<T, false>
) => {
  const { children, selectProps } = props;
  const data = selectProps.value as OptionUserExtend;
  return (
    <components.Control {...props}>
      <div className="controlUser">
        {data && <IconProfile dni={data.dni} size={1.5} />}
        {children}
      </div>
    </components.Control>
  );
};

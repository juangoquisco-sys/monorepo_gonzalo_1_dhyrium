import { components, type OptionProps } from 'react-select';
import type { OptionSelect } from '@/types/option.types';
import ButtonDelete from '../../../button/ButtonDelete';
import IconAction from '../../../iconAction/IconAction';
import './optionCrudSelect.css';
interface CustomOptionProps<T extends OptionSelect> extends OptionProps<T> {
  onEditOption?: (data: T) => void;
  onSave?: () => void;
  urlDelete: (data: T) => String;
  sizeIcon?: number;
}

const OptionCrudSelect = <T extends OptionSelect>(
  props: CustomOptionProps<T>
) => {
  const { data, onEditOption, onSave, urlDelete, sizeIcon = 1.5 } = props;
  const isNew = '__isNew__' in data && data.__isNew__;
  return (
    <components.Option {...props}>
      <div className="OptionCrudSelect-option">
        <span style={{ marginRight: '8px' }}>{data.label}</span>
        {!isNew && (
          <div className="OptionCrudSelect-option-actions">
            <ButtonDelete
              icon="trash-red"
              url={`${urlDelete(data)}`}
              className="OptionCrudSelect-btn-delete"
              onSave={onSave}
              type="button"
              style={{
                width: `${sizeIcon}rem`,
              }}
            />
            <IconAction
              icon="pencil-line"
              position="none"
              size={sizeIcon}
              onClick={() => onEditOption?.(data)}
            />
          </div>
        )}
      </div>
    </components.Option>
  );
};

export default OptionCrudSelect;

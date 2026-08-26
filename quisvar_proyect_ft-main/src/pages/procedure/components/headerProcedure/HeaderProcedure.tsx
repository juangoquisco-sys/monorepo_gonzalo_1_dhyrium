import { HiSquare3Stack3D } from 'react-icons/hi2';
import Button from '@/components/button/Button';
import DivFlex from '@/components/divFlex/DivFlex';
import HeaderOptionBtn from '@/components/headerOption/HeaderOptionBtn';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import type { HeaderOptionProps } from '@/types/types';
import { COLOR_CSS } from '@/utils/cssData';
import { PiArrowClockwiseBold, PiMagnifyingGlassBold } from 'react-icons/pi';
import type { QueryProcedure } from '../../interfaces/procedure.types';
import { useState, type ChangeEvent } from 'react';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import { useSearchParams } from 'react-router-dom';
import {
  getMessageTypeFilterId,
  holdingOptions,
  listStatusMsg,
  listTypeMsg,
} from '@/utils/files/files.utils';
import './headerProcedure.css';

interface HeaderProcedureProps {
  optionsMailHeader: (Omit<HeaderOptionProps, 'onClick'> & {
    funcion: () => void;
  })[];
  hasAccessPayroll?: boolean;
  goToPayroll?: () => void;
  query: QueryProcedure;
  refresh: () => void;
  handleNewMessage: () => void;
}
const HeaderProcedure = ({
  optionsMailHeader,
  hasAccessPayroll = false,
  goToPayroll,
  query,
  refresh,
  handleNewMessage,
}: HeaderProcedureProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const handleSearch = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { value } = target;
    setSearch(value);
    handleSearchDebounced(value);
  };

  const handleSearchDebounced = useDebounceCallback((value: string) => {
    value ? searchParams.set('search', value) : searchParams.delete('search');
    setSearchParams(searchParams);
  }, 500);

  const handleFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = target;
    value ? searchParams.set(name, value) : searchParams.delete(name);
    setSearchParams(searchParams);
  };

  const handleClickOption = (funcion: () => void) => {
    if (search) setSearch('');
    funcion();
  };
  return (
    <div className={`headerProcedure`}>
      <div className="headerProcedure-filter">
        <DivFlex gap={0} autoWidth>
          {optionsMailHeader.map(
            ({ funcion, iconOff, iconOn, text, isActive }) => (
              <HeaderOptionBtn
                key={text}
                iconOff={iconOff}
                iconOn={iconOn}
                text={text}
                isActive={isActive}
                onClick={() => handleClickOption(funcion)}
                width={10}
              />
            )
          )}
          {hasAccessPayroll && !!goToPayroll && (
            <HiSquare3Stack3D
              onClick={goToPayroll}
              color={COLOR_CSS.secondary}
              style={{ marginLeft: '1rem' }}
              size={22}
              cursor={'pointer'}
            />
          )}
        </DivFlex>
        <Input
          placeholder="Buscar tramite"
          full={false}
          leftIcon={<PiMagnifyingGlassBold size={18} color={COLOR_CSS.gray} />}
          onChange={handleSearch}
          value={search}
          autoFocus
        />
        <div className="headerProcedure-options-container">
          <IconAction icon="filter" text="Filtrar" />
          {query.status !== 'ARCHIVADO' && (
            <Select
              value={query.status}
              data={listStatusMsg}
              placeholder="Estado"
              onChange={handleFilter}
              name="status"
              extractValue={({ id }) => id}
              renderTextField={({ label }) => label}
              styleVariant="tertiary"
            />
          )}
          <Select
            value={getMessageTypeFilterId(query.typeMessage)}
            styleVariant="tertiary"
            placeholder="Documento"
            data={listTypeMsg}
            onChange={handleFilter}
            name="typeMessage"
            extractValue={({ id }) => id}
            renderTextField={({ label }) => label}
          />

          {query.typeMail === 'RECEPTION' && (
            <Select
              value={query.onHolding}
              styleVariant="tertiary"
              placeholder="Condición"
              data={holdingOptions}
              onChange={handleFilter}
              name="onHolding"
              extractValue={({ id }) => id}
              renderTextField={({ label }) => label}
            />
          )}
        </div>
        <DivFlex autoWidth>
          <Button
            leftIcon={<PiArrowClockwiseBold size={17} />}
            color="gray"
            size="xxs"
            onClick={refresh}
            borderRadius={10}
          />
          <Button
            onClick={handleNewMessage}
            icon="plus-dark"
            text="Nuevo Trámite"
            color="lightPrimary"
            textColor="secondary"
          />
        </DivFlex>
      </div>
    </div>
  );
};

export default HeaderProcedure;

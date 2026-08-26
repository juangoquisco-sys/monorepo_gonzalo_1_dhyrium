import { useState } from 'react';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import IconAction from '@/components/iconAction/IconAction';
import type { ContractSpecialties } from '../../../../models/type.contracts';
import './listProfessionalItem.css';
import type { SingleValue } from 'react-select';
import type { Specialists } from '@/types/types';
import useAddSpecialistsMutation from '../../hooks/useAddSpecialistsMutation';
import useDeleteSpecialtiesMutation from '../../hooks/useDeleteSpecialtiesMutation';

interface ListProfessionalItemProps {
  contractSpecialty: ContractSpecialties;
  handleViewPdf: (specialists: Specialists, specialityName: string) => void;
}

const ListProfessionalItem = ({
  contractSpecialty,
  handleViewPdf,
}: ListProfessionalItemProps) => {
  const {
    listSpecialties,
    specialists,
    id: contractSpecialtiesId,
    contratcId,
  } = contractSpecialty;

  const addSpecialistsMutation = useAddSpecialistsMutation();
  const deleteSpecialtiesMutation = useDeleteSpecialtiesMutation();
  const [isEdit, setIsEdit] = useState(false);
  const handleEdit = () => setIsEdit(!isEdit);
  const handleSelectOption = async (option: SingleValue<Specialists>) => {
    if (!option) return;
    setIsEdit(false);
    const data = { ...option, contratcId, contractSpecialtiesId };
    addSpecialistsMutation.mutate(data);
  };

  const handleDeleteSpecialty = async () =>
    deleteSpecialtiesMutation.mutate({ contractSpecialtiesId, contratcId });

  const pressPdf = () => {
    if (specialists) handleViewPdf(specialists, listSpecialties.name);
  };
  return (
    <div className="listProfessionalItem">
      <div className="listProfessionalItem-main">
        <IconAction icon="user-check" position="none" />

        <span className="listProfessionalItem-label">
          {listSpecialties.name}
        </span>
        {specialists && !isEdit ? (
          <span className="listProfessionalItem-label-specialists">
            : {specialists.firstName} {specialists.lastName}
          </span>
        ) : (
          <div
            style={{
              width: '15rem',
            }}
          >
            <AdvancedSelect
              options={listSpecialties.users}
              menuPosition="fixed"
              onChange={handleSelectOption}
              defaultValue={
                specialists
                  ? listSpecialties.users.find(
                      user => user.id === specialists.id
                    )
                  : undefined
              }
            />
          </div>
        )}
        {specialists && (
          <IconAction
            icon={!isEdit ? 'pencil' : 'close'}
            size={0.8}
            position="none"
            onClick={handleEdit}
          />
        )}
      </div>
      <div className="listProfessionalItem-right-actions">
        <IconAction
          icon="pdf-red"
          position="none"
          classNameText="listProfessionalItem-text-icon"
          text="Declaración jurada"
          onClick={pressPdf}
        />
        <IconAction
          icon="trash-gray"
          position="none"
          onClick={handleDeleteSpecialty}
        />
      </div>
    </div>
  );
};

export default ListProfessionalItem;

import type { SingleValue } from 'react-select';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import IconAction from '@/components/iconAction/IconAction';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import type { SpecialtiesSelect } from '@/pages/userCenter/models/specialtyOption.types';
import useListProfessionals from '../../hooks/useListProfessionals';
import useSpecialtiesSelect from '../../hooks/useSpecialtiesSelect';
import useSpecialtiesSelectMutation from '../../hooks/useSpecialtiesSelectMutation';
import './listProfessionals.css';
import ListProfessionalItem from '../../components/listProfessionalItem/ListProfessionalItem';
import { excelProfessionalContract } from '../../../../generateExcel/excelProfessionalContract';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import type { Specialists } from '@/types/types';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import SpecialistDeclarationPdf from '../../../../pdfGenerator/specialistDeclarationPdf/SpecialistDeclarationPdf';
import { URL } from '@/services/axiosInstance';

interface ListProfessionalsProp {
  idContract: number;
}

const ListProfessionals = ({ idContract }: ListProfessionalsProp) => {
  const specialtiesSelectMutation = useSpecialtiesSelectMutation();
  const { listProfessionalQuery } = useListProfessionals(idContract);
  const { specialtiesSelectQuery } = useSpecialtiesSelect();
  const contract = useSelector((state: RootState) => state.contract);

  const handleSelectOption = async (option: SingleValue<SpecialtiesSelect>) => {
    if (!option?.id) return;
    specialtiesSelectMutation.mutate({
      listSpecialtiesId: option.id,
      contratcId: idContract,
    });
  };

  const handleViewPdf = (specialists: Specialists, specialityName: string) => {
    if (!specialists || !contract) return;
    const { company, consortium } = contract;
    const srcImage = `${URL}/images/img/${
      company?.img
        ? `companies/${company?.img}`
        : `consortium/${consortium?.img}`
    }`;
    const newSpecialists = {
      ...specialists,
      speciality: specialityName,
      nameContract: contract.name,
      projectName: contract.projectName,
      municipio: contract.municipality,
      cui: contract.cui,
      srcImage,
    };
    isOpenViewPdf$.setSubject = {
      fileNamePdf:
        'Declaración jurada - ' +
        specialists.firstName +
        ' ' +
        specialists.lastName,
      pdfComponentFunction: SpecialistDeclarationPdf({ data: newSpecialists }),
      isOpen: true,
    };
  };

  const handleReport = () => {
    const { data: contractSpecialities } = listProfessionalQuery;
    if (!contract || !contractSpecialities) return;
    excelProfessionalContract({
      contract,
      contractSpecialities,
    });
  };
  return (
    <div className="listProfessionals">
      {listProfessionalQuery.isFetching && (
        <div className="listProfessionals-loader">
          <LoaderOnly />
        </div>
      )}
      <div className="listProfessionals-header">
        <h3 className="listProfessionals-header-title">Especialistas</h3>
        <IconAction
          icon="excel-icon"
          text="Cuadro de profesionales"
          onClick={handleReport}
        />
      </div>
      <div className="listProfessionals-main">
        {listProfessionalQuery.data?.map(contractSpecialty => (
          <ListProfessionalItem
            key={contractSpecialty.id}
            contractSpecialty={contractSpecialty}
            handleViewPdf={handleViewPdf}
          />
        ))}
        {specialtiesSelectMutation.isPending && (
          <div
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <LoaderOnly />
          </div>
        )}
        <AdvancedSelect
          options={specialtiesSelectQuery.data}
          value={null}
          menuPosition="fixed"
          onChange={handleSelectOption}
          isLoading={
            specialtiesSelectQuery.isFetching ||
            specialtiesSelectMutation.isPending
          }
          placeholder={'Agregar especialidad'}
          isDisabled={specialtiesSelectMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ListProfessionals;

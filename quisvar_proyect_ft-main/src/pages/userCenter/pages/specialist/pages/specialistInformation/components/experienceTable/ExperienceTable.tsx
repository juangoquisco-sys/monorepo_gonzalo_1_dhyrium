import { URL } from '@/services/axiosInstance';
import type { AreaSpecialty, Experience, Option } from '@/types/types';
import './experienceTable.css';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Button from '@/components/button/Button';
import { formatDate } from '@/utils/formatDate';
import { calcDates } from '@/utils/experienceFunctions/experienceFunctions';

interface ExperienceTableProps {
  datos: Experience['areaSpecialtyName'];
  id: number;
  handleFuntion: (open: boolean, identifier: number) => void;
  handleEdit: (open: boolean, identifier: number, data: AreaSpecialty) => void;
  handleDelete: (id: number) => void;
}

const ExperienceTable = ({
  datos,
  id,
  handleFuntion,
  handleEdit,
  handleDelete,
}: ExperienceTableProps) => {
  const formattedDate = (value: Date) => {
    const newDate = formatDate(new Date(value), {
      month: 'short',
      year: 'numeric',
    });
    return newDate;
  };

  return (
    <div className="experience-table-content">
      <div className="experience-table-title">
        <h4 className="ex-table-title-text">Experiencia laboral</h4>
        <Button
          text="+ Agregar Experiencia"
          onClick={() => handleFuntion(true, id)}
          variant="outline"
        />
      </div>
      <div className="experience-table-header">
        <div className="ex-center">ITEM</div>
        <div>INSTITUCIÓN</div>
        <div>DESCRIPCIÓN</div>
        <div>FECHA</div>
        <div>PERMANENCIA</div>
        <div className="ex-center">DOCUMENTO</div>
      </div>
      {datos &&
        datos.map((dato, idx) => {
          const res = calcDates(dato.startDate, dato.untilDate);
          const optionsData: Option[] = [
            {
              name: 'Editar',
              type: 'button',
              icon: 'pencil',
              function: () => handleEdit(true, dato.id, dato),
            },
            {
              name: 'Eliminar',
              type: 'button',
              icon: 'trash-red',
              function: () => handleDelete(dato.id),
            },
          ];
          return (
            <AppContextMenu
              data={optionsData}
              key={dato.id}
              className="experience-table-body"
            >
              <>
                <div className="ex-center">{idx + 1}</div>
                <div>{dato.institution}</div>
                <div>descripcion</div>
                <div>
                  {formattedDate(dato.startDate) +
                    ' - ' +
                    formattedDate(dato.untilDate)}
                </div>
                <div>{`${res.years} año(s) y ${res.months} mes(es)`}</div>
                <div className="ex-center">
                  <span className="specialist-icon-cv">
                    <a
                      href={`${URL}/file-user/specialty/${dato?.file}`}
                      target="_blank"
                    >
                      <img
                        src="/svg/pdf-red.svg"
                        className="specialist-info-icon"
                      />
                    </a>
                  </span>
                </div>
              </>
            </AppContextMenu>
          );
        })}
    </div>
  );
};

export default ExperienceTable;

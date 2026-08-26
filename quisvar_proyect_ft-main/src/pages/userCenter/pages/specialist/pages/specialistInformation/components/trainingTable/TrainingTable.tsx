import { URL } from '@/services/axiosInstance';
import type { Option, Training, TrainingSpecialty } from '@/types/types';
import { formatDate } from '@/utils/formatDate';
import './trainingTable.css';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Button from '@/components/button/Button';

interface ExperienceTableProps {
  datos: Training['trainingSpecialistName'];
  id: number;
  handleFuntion: (open: boolean, identifier: number) => void;
  handleEdit: (
    open: boolean,
    trainingListId: number,
    recordId: number,
    data: TrainingSpecialty
  ) => void;
  handleDelete: (id: number) => void;
}
const TrainingTable = ({
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
    <div className="training-table-content">
      <div className="experience-table-title">
        <h4 className="ex-table-title-text">Capacitaciones y certificados</h4>
        <Button
          text="+ Agregar Capacitación"
          onClick={() => handleFuntion(true, id)}
          variant="outline"
        />
      </div>
      <div className="training-table-header">
        <div className="ex-center">ITEM</div>
        <div>INSTITUCIÓN</div>
        <div>EMISIÓN</div>
        <div>DURACIÓN</div>
        <div>HORAS</div>
        <div>NIVEL</div>
        <div className="ex-center">DOCUMENTO</div>
      </div>
      {datos &&
        datos.map((dato, idx) => {
          const optionsData: Option[] = [
            {
              name: 'Editar',
              type: 'button',
              icon: 'pencil',
              function: () => handleEdit(true, id, dato.id, dato),
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
              className="training-table-body"
            >
              <>
                <div className="tr-center">{idx + 1}</div>
                <div>{dato.institution}</div>
                <div>
                  {formatDate(new Date(dato.issue), {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div>
                  {formattedDate(dato.startDate as Date) +
                    ' - ' +
                    formattedDate(dato.untilDate as Date)}
                </div>
                <div>{dato.hours}</div>
                <div>{dato.level}</div>
                <div className="tr-center">
                  <span className="specialist-icon-cv">
                    <a
                      href={`${URL}/file-user/training/${dato?.trainingFile}`}
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

export default TrainingTable;

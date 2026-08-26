import { IoDocumentTextOutline } from 'react-icons/io5';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import { isOpenCardAddReport$ } from '@/services/sharingSubject';
import CardRegisterReport from '../../views/cardRegisterReport/CardRegisterReport';
import './administrativeTasks.css';
import { COLOR_CSS } from '@/utils/cssData';
import { useNavigate } from 'react-router-dom';
import KanbanTask from '../../../kanbanTask/KanbanTask';
import { useState } from 'react';
import { _date } from '@/utils/formatDate';
const today = new Date();
const AdministrativeTasks = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(_date(today));
  const handleOpenCardReport = () => {
    isOpenCardAddReport$.setSubject = {
      isOpen: true,
    };
  };
  const onNavigateReports = () => navigate('/mis-reportes');

  return (
    <div className="administrativeTasks">
      <div className="administrativeTasks-header">
        <div>
          <Input
            type="date"
            onChange={e => setDate(e.target.value)}
            width={12}
            max={_date(today)}
            defaultValue={_date(today)}
          />
        </div>
        <div className="administrativeTasks-header-btn">
          <IoDocumentTextOutline
            color={COLOR_CSS.secondary}
            size={21}
            style={{ marginRight: '0.5rem' }}
            onClick={onNavigateReports}
            cursor={'pointer'}
          />
          <Button text="Generar reporte" onClick={handleOpenCardReport} />
        </div>
      </div>
      <KanbanTask date={date} />
      <CardRegisterReport />
    </div>
  );
};

export default AdministrativeTasks;

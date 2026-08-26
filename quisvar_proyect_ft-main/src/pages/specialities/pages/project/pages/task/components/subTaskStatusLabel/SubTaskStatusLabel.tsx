import { STATUS_TEXT } from '@/pages/specialities/models/taskStatusText';
import './subTaskStatusLabel.css';

interface SubTaskStatusLabelProps {
  status: keyof typeof STATUS_TEXT;
}

const SubTaskStatusLabel = ({ status }: SubTaskStatusLabelProps) => {
  return (
    <div className="subTaskStatusLabel-content">
      <label
        className={`subTaskStatusLabel-text subTaskStatusLabel-${status} `}
      >
        {STATUS_TEXT[status]}
      </label>
    </div>
  );
};

export default SubTaskStatusLabel;

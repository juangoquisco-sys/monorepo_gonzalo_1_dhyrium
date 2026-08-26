import Button from '@/components/button/Button';

interface TaskFileTemplateProps {
  name: string;
  icon: string;
  showDeleteBtn?: boolean;
  onDeleteFile: () => void;
  onClick?: () => void;
  actionLabel?: string;
}

const TaskFileTemplate = ({
  icon,
  name,
  onDeleteFile,
  showDeleteBtn = false,
  onClick,
  actionLabel,
}: TaskFileTemplateProps) => {
  return (
    <div className="subtaskFile-contain">
      <button
        type="button"
        className="subtaskFile-anchor"
        onClick={onClick}
        aria-label={actionLabel}
        title={actionLabel ?? name}
      >
        <img
          src={`/svg/${icon}.svg`}
          alt="W3Schools"
          className="subtaskFile-icon"
        />
        <span className="subtaskFile-name">{name}</span>
      </button>
      {showDeleteBtn && (
        <Button
          icon="trash-red"
          onClick={onDeleteFile}
          variant="ghost"
          iconSize={0.8}
        />
      )}
    </div>
  );
};

export default TaskFileTemplate;

import './labelStatus.css';

interface LabelStatusProps {
  status: string;
}

const LabelStatus = ({ status }: LabelStatusProps) => {
  return (
    <div className="labelStatus-container">
      <span className={`labelStatus status-${status}`}>
        {status?.replaceAll('_', ' ')}
      </span>
    </div>
  );
};

export default LabelStatus;

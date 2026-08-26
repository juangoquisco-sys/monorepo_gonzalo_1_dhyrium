import './chipFileDownLoadProcedure.css';

interface ChipFileDownLoadProcedureProps {
  onClick: () => void;
  iconOne: string;
  iconTwo: string;
  text: string;
}

const ChipFileDownLoadProcedure = ({
  iconOne,
  iconTwo,
  onClick,
  text,
}: ChipFileDownLoadProcedureProps) => {
  return (
    <div className="chipFileDownLoadProcedure" onClick={onClick}>
      <img
        className="chipFileDownLoadProcedure-icon normal"
        src={`/svg/${iconOne}.svg`}
      />
      <img
        className="chipFileDownLoadProcedure-icon hover"
        src={`/svg/${iconTwo}.svg`}
      />
      <span>{text}</span>
    </div>
  );
};

export default ChipFileDownLoadProcedure;

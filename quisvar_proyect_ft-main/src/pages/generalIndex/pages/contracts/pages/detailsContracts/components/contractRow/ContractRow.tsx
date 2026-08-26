import './contractRow.css';
interface ContractRowProps {
  title: string;
  value: string;
}
const ContractRow = ({ title, value }: ContractRowProps) => {
  return (
    <div key={title} className="detailsContracts-row-container">
      <span className="contractRow-text-subtitle">{title}</span>
      <span className="contractRow-text-info">{value}</span>
    </div>
  );
};

export default ContractRow;

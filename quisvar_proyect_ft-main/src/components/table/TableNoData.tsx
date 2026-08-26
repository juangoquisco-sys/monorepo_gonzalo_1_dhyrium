import './table.css';

interface TableNoDataProps {
  text?: string;
}

const TableNoData = ({ text }: TableNoDataProps) => {
  return (
    <div className="TableNoData">
      <p>{text || 'No hay datos para mostrar'}</p>
    </div>
  );
};

export default TableNoData;

import './costTable.css';
interface CostTableProps {
  mount: number;
  text?: string;
}
export const CostTable = ({
  mount = 0,
  text = 'Cuadro de costos',
}: CostTableProps) => {
  if (isNaN(mount)) mount = 0;
  const partialByMounth = +(mount / 30).toFixed(2);
  const stayByMounth = +(1000 / 30).toFixed(2);

  const dataCostTable = {
    ['Parcial/ por mes']: {
      fistMount: mount,
      secondMount: partialByMounth.toFixed(2),
      isPrincipal: true,
    },
    ['Estadia/ por mes']: {
      fistMount: 1000,
      secondMount: stayByMounth,
      isPrincipal: false,
    },
    ['Sueldo Bruto']: {
      fistMount: mount + 1000,
      secondMount: (partialByMounth + stayByMounth).toFixed(2),
      isPrincipal: false,
    },
  };
  return (
    <div className="costTable">
      <div className="costTable-header">{text}</div>
      {Object.entries(dataCostTable).map(([key, obj]) => (
        <div className="costTable-content" key={key}>
          <span className="costTable-content-text text-title">{key}</span>
          <span
            className={`costTable-content-text ${
              obj.isPrincipal && 'costTable-content-text-main'
            }`}
          >
            S/ {obj.fistMount}
          </span>
          <span className="costTable-content-text">S/ {obj.secondMount}</span>
        </div>
      ))}
    </div>
  );
};

export default CostTable;

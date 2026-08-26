import './Legend.css';

const Legend = () => {
  const data = [
    {
      item: 1,
      simbolo: 'P',
      descripcion: 'Puntual (P)',
      multa: 'S/. 0.00',
      multaAdmin: 'S/. 0.00',
    },
    {
      item: 2,
      simbolo: 'T',
      descripcion: 'Tardanza (T)',
      multa: 'S/. 0.50',
      multaAdmin: 'S/. 1.00',
    },
    {
      item: 3,
      simbolo: 'F',
      descripcion: 'Falta simple (F)',
      multa: 'S/. 10.00',
      multaAdmin: 'S/. 20.00',
    },
    {
      item: 4,
      simbolo: 'G',
      descripcion: 'Falta grave (G)',
      multa: 'S/. 20.00',
      multaAdmin: 'S/. 40.00',
    },
    {
      item: 5,
      simbolo: 'M',
      descripcion: 'Falta muy grave (M)',
      multa: 'S/. 80.00',
      multaAdmin: 'S/. 160.00',
    },
    {
      item: 6,
      simbolo: 'L',
      descripcion: 'Licencia o permiso (L)',
      multa: 'S/. 0.00',
      multaAdmin: 'S/. 0.00',
    },
    {
      item: 7,
      simbolo: 'S',
      descripcion: 'Salidas de campo (S)',
      multa: 'S/. 0.00',
      multaAdmin: 'S/. 0.00',
    },
  ];
  return (
    <div className="legend-container">
      <div className="legend-header">
        <div className="legend-list-text legend-place">ITEM</div>
        <div className="legend-list-text legend-place">SIMBOLO</div>
        <div className="legend-list-text legend-margin">DESCRIPCION</div>
        <div className="legend-list-text legend-place">MULTA</div>
        <div className="legend-list-text legend-place">
          MULTA COORDINADORES Y GERENTES
        </div>
      </div>
      {data.map(item => (
        <div
          className={`legend-list-content ${
            item.item % 2 === 0 && 'legend-bg'
          }`}
          key={item.item}
        >
          <div className="legend-col legend-place">{item.item}</div>
          <div
            className={`legend-col legend-place 
                ${item.simbolo === 'P' && 'legend-p'}
                ${item.simbolo === 'T' && 'legend-t'}
                ${item.simbolo === 'F' && 'legend-f'}
                ${item.simbolo === 'G' && 'legend-g'}
                ${item.simbolo === 'M' && 'legend-m'}
                ${item.simbolo === 'L' && 'legend-l'}
                ${item.simbolo === 'S' && 'legend-s'}
                `}
          >
            {item.simbolo}
          </div>
          <div className="legend-col legend-margin">{item.descripcion}</div>
          <div className="legend-col legend-place">{item.multa}</div>
          <div className="legend-col legend-place">{item.multaAdmin}</div>
        </div>
      ))}
    </div>
  );
};

export default Legend;

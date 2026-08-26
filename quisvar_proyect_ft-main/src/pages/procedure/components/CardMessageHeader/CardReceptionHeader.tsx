import './cardMessageHeader.css';

const CardReceptionHeader = () => {
  return (
    <div className={`cardMessageRow-container `}>
      <div className="cardMessageHeader-header-item">
        <span>DOCUMENTO</span>
      </div>
      <div className="cardMessageHeader-header-item ">
        <span>TRAMITANTE</span>
      </div>
      <div className="cardMessageHeader-header-item ">
        <span>ASUNTO</span>
      </div>
      <div className="cardMessageHeader-header-item">
        <span>DESTINATARIO</span>
      </div>
      <div className="cardMessageHeader-header-item">
        <span>ESTADO</span>
      </div>
      <div className="cardMessageHeader-header-item">
        <span>DEPENDENCIA ACTUAL</span>
      </div>
      <div className="cardMessageHeader-header-item">
        <span>FECHA DE ENVÍO</span>
      </div>
      <div className="cardMessageHeader-header-item cardMessageHeader-cursor-none">
        <span>ACCIÓN</span>
      </div>
    </div>
  );
};

export default CardReceptionHeader;

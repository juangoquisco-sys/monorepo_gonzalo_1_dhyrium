import './fundsHeader.css';

const FundsHeader = () => {
  return (
    <div className="fh-container">
      <div className="fh-text">ITEM</div>
      <div className="fh-text">CONCEPTO</div>
      {/* <div className="fh-text">CATEGORÍA</div> */}
      <div className="fh-text">MONTO</div>
      <div className="fh-text">COMPROBANTE</div>
    </div>
  );
};

export default FundsHeader;

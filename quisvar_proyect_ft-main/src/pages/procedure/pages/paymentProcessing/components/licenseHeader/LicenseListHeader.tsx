import IconAction from '@/components/iconAction/IconAction';
import './LicenseListHeader.css';
type license = {
  isEmployee?: boolean;
  refresh: () => void;
};
export const LicenseListHeader = ({ isEmployee, refresh }: license) => {
  return (
    <div
      className={`license-header-content ${
        isEmployee ? 'license-employee' : 'license-admin'
      }`}
    >
      <IconAction icon="refresh" onClick={refresh} right={0.9} top={0.5} />
      <div
        className="license-header-items"
        style={{ justifyContent: 'center' }}
      >
        item
      </div>
      {!isEmployee && (
        <div className="license-header-items license-header-applicant">
          solicitante
        </div>
      )}
      <div className="license-header-items">Revisado por</div>
      {isEmployee && (
        <>
          <div className="license-header-items">Tipo</div>
          <div
            className="license-header-items"
            style={{ justifyContent: 'center' }}
          >
            fecha de envío
          </div>
        </>
      )}

      <div className="license-header-items">motivo</div>
      <div className="license-header-items">descripcion</div>
      <div className="license-header-items">estado</div>
      <div className="license-header-items">salida</div>
      <div className="license-header-items">retorno</div>
      <div className="license-header-items">llegada</div>
      <div className="license-header-items">observación</div>
      <div className="license-header-items">acción</div>
    </div>
  );
};

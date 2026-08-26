import './commingSoon.css';
import { useNavigate } from 'react-router-dom';

export const CommingSoon = () => {
  const navigation = useNavigate();

  const handleReturn = () => navigation('/login');

  return (
    <div className="commingSoon">
      <figure className="commingSoon-figure">
        <img
          alt="cohete"
          src="/img/comming-soon.png"
          className="commingSoon-figure-img"
        />
      </figure>
      <div className="commingSoon-group">
        <div className="commingSoon-title">Actualización en progreso</div>
        <p className="commingSoon-paragraph">
          Disculpa las molestias estamos mejorando la
          <span className="commingSoon-span">
            experiencia del usuario y el contenido.
          </span>
        </p>
        <input
          type="button"
          onClick={handleReturn}
          value="VOLVER"
          className="commingSoon-btn"
        />
      </div>
      <div className="commingSoon-contain-logo">
        <img src="/img/quisvar_logo.png" alt="logo" />
      </div>
    </div>
  );
};

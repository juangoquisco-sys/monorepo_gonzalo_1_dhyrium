import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';
import FormLogin from './view/formLogin/FormLogin';
import FormRecoveryPassword from './view/formRecoveryPassword/FormRecoveryPassword';
import useLocalStorage from '@/hooks/useLocalStorage';

export const Login = () => {
  const navigate = useNavigate();

  const [recoveryPassword, setRecoveryPassword] = useState(false);
  const handleRecoveryPassword = () => setRecoveryPassword(!recoveryPassword);
  const token = useLocalStorage('token');
  useEffect(() => {
    if (token) {
      navigate('/home');
    }
  }, [navigate, token]);

  return (
    <div className="login">
      <figure className="login-figure">
        <img alt="" src="/img/room.jpg" className="login-figure-img" />
        <div className="login-contain-logo">
          <img src="/img/dhyrium_logo.png" alt="" />
        </div>
      </figure>
      <div className="login-form">
        <div className="card-form">
          <img src="/img/dhyrium_logo.png" alt="" />
          {!recoveryPassword ? <FormLogin /> : <FormRecoveryPassword />}
          <span
            className={`login-forgot-email ${
              !recoveryPassword ? 'login-text-red' : 'login-text-normal'
            } `}
            onClick={handleRecoveryPassword}
          >
            {!recoveryPassword
              ? ' ¿Olvidaste tu contraseña?'
              : '⬅ Regresar al login'}
          </span>
        </div>
      </div>
    </div>
  );
};

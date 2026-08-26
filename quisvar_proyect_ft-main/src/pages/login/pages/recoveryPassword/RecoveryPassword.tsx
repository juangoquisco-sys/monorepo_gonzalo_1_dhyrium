import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import Input from '@/components/Input/Input';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { validateRepeatPassword } from '@/utils/customValidatesForm';
import './recoveryPassword.css';
interface resetPassworForm {
  newPassword: string;
  verifyPassword: string;
}

const RecoveryPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<resetPassworForm>();

  const sendForm: SubmitHandler<resetPassworForm> = data => {
    const { newPassword, verifyPassword } = data;
    if (newPassword !== verifyPassword) return;
    axiosInstance
      .post('/auth/new-password', data, {
        headers: {
          reset: token,
        },
      })
      .then(res => {
        localStorage.removeItem('token');
        navigateToLogin();
        SnackbarUtilities.success(res.data.msg);
      }).catch;
  };
  const navigateToLogin = () => {
    navigate('/login');
  };
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

          <div className="formRecoveryPassword">
            <div className="formRecoveryPassword-header">
              <h2>Nueva Contraseña</h2>
              <p>Establece tu nueva contraseña.</p>
            </div>
            <form
              onSubmit={handleSubmit(sendForm)}
              className="recoveryPassword-form"
            >
              <div className="form-group">
                <Input
                  label="Ingrese la nueva contraseña:"
                  placeholder="Contraseña"
                  {...register('newPassword', { required: true })}
                  errors={errors}
                  type="password"
                  styleInput={2}
                />
              </div>
              <div className="form-group">
                <Input
                  {...register('verifyPassword', {
                    required: true,
                    validate: val =>
                      validateRepeatPassword(val, watch('newPassword')),
                  })}
                  name="verifyPassword"
                  placeholder="Confirmar contraseña"
                  type="password"
                  errors={errors}
                  label="Confirmar contraseña:"
                  styleInput={2}
                />
              </div>

              <button type="submit" className="login-btn">
                ENVIAR
              </button>
            </form>
          </div>
          <span
            className={`login-forgot-email login-text-normal`}
            onClick={navigateToLogin}
          >
            ⬅ Regresar
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecoveryPassword;

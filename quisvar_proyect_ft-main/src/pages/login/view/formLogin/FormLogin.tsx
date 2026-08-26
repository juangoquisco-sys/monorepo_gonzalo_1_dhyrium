import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import Input from '@/components/Input/Input';
import { axiosInstance } from '@/services/axiosInstance';
import { useLocation, useNavigate } from 'react-router-dom';
import { validateDNI } from '@/utils/customValidatesForm';
import './formLogin.css';
interface loginForm {
  dni: string;
  password: string;
}

const FormLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginForm>();

  const sendForm: SubmitHandler<loginForm> = data => {
    axiosInstance
      .post('/auth/login', data)
      .then(res => {
        localStorage.setItem('token', res.data.token);
        localStorage.removeItem('logout');
        navigate(from);
      })
      .catch(err => console.log(err));
  };
  return (
    <form onSubmit={handleSubmit(sendForm)} className="formLogin">
      <div className="form-group">
        <Input
          label="Ingrese DNI"
          placeholder="DNI"
          {...register('dni', {
            required: true,
            validate: validateDNI,
          })}
          type="text"
          errors={errors}
        />
      </div>
      <div className="form-group">
        <Input
          label="Contraseña"
          placeholder="Contraseña"
          {...register('password', { required: true })}
          errors={errors}
          type="password"
        />
      </div>
      <button type="submit" className="login-btn">
        INGRESAR
      </button>
    </form>
  );
};

export default FormLogin;

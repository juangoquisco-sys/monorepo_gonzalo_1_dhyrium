import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { validateDNI } from '@/utils/customValidatesForm';
import Input from '@/components/Input/Input';
import './formRecoveryPassword.css';
interface recoveryPasswordForm {
  dni: string;
}
const FormRecoveryPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<recoveryPasswordForm>();

  const sendForm: SubmitHandler<recoveryPasswordForm> = data => {
    axiosInstance
      .post('/auth/forgot-password', data)
      .then(res => {
        SnackbarUtilities.success(res.data.msg);
      })
      .catch(err => console.log(err));
  };
  return (
    <div className="formRecoveryPassword">
      <div className="formRecoveryPassword-header">
        <h2>RECUPERA TU CUENTA</h2>
        <h6>
          Ingrese el dni con el que se registro, se le enviara un link a su
          correo para completar el proceso.
        </h6>
      </div>
      <form onSubmit={handleSubmit(sendForm)} className="formLogin">
        <div className="form-group">
          <Input
            placeholder="DNI"
            {...register('dni', {
              required: true,
              validate: validateDNI,
            })}
            type="text"
            styleInput={2}
            errors={errors}
          />
        </div>

        <button type="submit" className="login-btn">
          ENVIAR
        </button>
      </form>
    </div>
  );
};

export default FormRecoveryPassword;

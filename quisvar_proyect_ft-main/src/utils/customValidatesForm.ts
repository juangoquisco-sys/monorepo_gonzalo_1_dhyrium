export const validateWhiteSpace = (
  value: string | undefined | number | null
) => {
  if (!value) return 'Este campo no puede estar vacío';
  value = String(value);
  if (value === 'NaN') return 'Este campo no puede estar vacío';
  return !value.trim()
    ? 'Este campo no puede estar vacío'
    : value[0].startsWith(' ')
    ? 'No deje espacios al inicio'
    : true;
};

export const validatePorcentage = (value: number) => {
  return value > 100 || value < 0 ? 'Ingresar un rango de 0 a 100' : true;
};

export const validateOnlyNumbers = <T>(value: T) => {
  if (!value) return true;
  const valTransform = String(value);
  const regex = /^[0-9]+$/;
  return !regex.test(valTransform)
    ? 'Ingrese solo caracteres numericos '
    : true;
};

export const validateOnlyDecimals = <T>(value: T) => {
  const valTransform = String(value);
  const regex = /^[0-9]+(\.[0-9]+)?$/;
  return !regex.test(valTransform)
    ? 'Ingrese solo caracteres numericos '
    : true;
};

export const validateCorrectTyping = <T>(value: T) => {
  if (!value || typeof value !== 'string')
    return 'Este campo no puede estar vacío';
  const regex = /^[a-zA-Z0-9,áéíóúÁÉÍÓÚñÑ()° _-]+$/;
  return !regex.test(value)
    ? 'Ingresar nombre que no contenga lo siguiente ^*/?@|<>": '
    : true;
};
export const validateEmail = (value: string) => {
  const regex = /^[\w]+(\.[\w]+)*@[\w]+(\.[\w]+)*\.[a-zA-Z]{2,5}$/i;
  return !regex.test(value) ? 'Ingresar un email valido' : true;
};
export const validateRepeatPassword = (value: string, password: string) => {
  return password != value ? 'Your passwords do no match' : true;
};

export const validateDNI = (value: string) => {
  const message = validateOnlyNumbers(value);
  if (typeof message === 'string') return message;
  return value.length !== 8 ? 'Ingresar un dni valido' : true;
};
export const validateRuc = (value: string) => {
  if (!value) return true;
  const message = validateOnlyNumbers(value);
  if (typeof message === 'string') return message;
  return value.length !== 11 ? 'Ingresar un ruc valido' : true;
};
export const validateJPGExtension = (value: FileList | undefined) => {
  const [file] = value as FileList;
  if (!file) return true; // puede que se tenga imagen o no
  const regex = /\.(jpg|jpeg|png|gif)$/i;
  return !regex.test(file.name) ? 'Ingrese un archivo .jpg' : true;
};

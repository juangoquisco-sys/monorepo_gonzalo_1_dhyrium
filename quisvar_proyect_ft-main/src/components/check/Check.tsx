import type { IconBaseProps } from 'react-icons/lib';
import { PiCheckFatFill, PiCheckFatLight } from 'react-icons/pi';

interface CheckProps extends IconBaseProps {
  isChecked?: boolean;
}
const Check = ({ isChecked = false, ...props }: CheckProps) => {
  const TypeIcon = isChecked ? PiCheckFatFill : PiCheckFatLight;
  return <TypeIcon {...props} />;
};

export default Check;

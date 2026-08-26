// import { Button } from '../../../../components';
import './buttonProcedure.css';

interface ButtonProcedureProps {
  icon: string;
  isActive: boolean;
  text: string;
  onClick: () => void;
}

const ButtonProcedure = ({
  icon,
  isActive,
  onClick,
  text,
}: ButtonProcedureProps) => {
  return (
    <button
      className={`buttonProcedure
    ${isActive && 'buttonProcedure--active'} `}
      onClick={onClick}
    >
      <figure className={`buttonProcedure-icon `}>
        <img src={`/svg/${icon}.svg`} />
      </figure>
      {text}
    </button>
  );
};

export default ButtonProcedure;

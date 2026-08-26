import './buttonHeader.css';

interface ButtonHeaderProps {
  isActive: boolean;
  text: string;
  onClick?: () => void;
}

const ButtonHeader = ({ isActive, text, onClick }: ButtonHeaderProps) => {
  return (
    <span
      className={`buttonHeader-link-span ${
        isActive && 'buttonHeader-link--active'
      }`}
      onClick={onClick}
    >
      {text}
    </span>
  );
};

export default ButtonHeader;

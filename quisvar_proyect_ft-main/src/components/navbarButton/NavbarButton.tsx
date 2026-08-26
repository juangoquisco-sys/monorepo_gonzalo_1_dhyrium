import './navbarButton.css';

interface NavbarButtonProps {
  isActive: boolean;
  text: string;
  onClick?: () => void;
}

const NavbarButton = ({ isActive, text, onClick }: NavbarButtonProps) => {
  return (
    <span
      className={`btn-navbar ${isActive && 'btn-navbar-active'}`}
      onClick={onClick}
    >
      {text}
    </span>
  );
};

export default NavbarButton;

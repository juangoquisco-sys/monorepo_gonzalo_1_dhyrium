import './customSwitch.css';
interface CustomSwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isToggle: boolean;
  onToggle: () => void;
}
const CustomSwitch = ({ isToggle, onToggle, ...props }: CustomSwitchProps) => {
  return (
    <label className="cs-switch" style={{ width: `32px`, height: `14px` }}>
      <input
        type="checkbox"
        checked={isToggle}
        onChange={onToggle}
        {...props}
      />
      <span className="cs-slider"></span>
    </label>
  );
};

export default CustomSwitch;

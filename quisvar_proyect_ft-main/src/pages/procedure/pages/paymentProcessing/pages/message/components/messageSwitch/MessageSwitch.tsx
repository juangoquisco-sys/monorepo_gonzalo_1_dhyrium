import { motion } from 'framer-motion';
import { SPRING } from '../../models/definitionsMessage';
import './messageSwitch.css';
interface MessageSwitchProps {
  isProceed: boolean;
  onClick: () => void;
}
const MessageSwitch = ({ isProceed, onClick }: MessageSwitchProps) => {
  return (
    <div
      className="messageSwitch-switch"
      data-ison={isProceed}
      onClick={onClick}
    >
      {isProceed && (
        <span className="messageSwitch-hover-title">NO PROCEDE</span>
      )}
      <motion.div className={`messageSwitch-handle`} layout transition={SPRING}>
        <span style={{ fontSize: 'small' }}>
          {isProceed ? 'Procede' : 'No Procede'}
        </span>
      </motion.div>
      {!isProceed && <span className="messageSwitch-hover-title">PROCEDE</span>}
    </div>
  );
};

export default MessageSwitch;

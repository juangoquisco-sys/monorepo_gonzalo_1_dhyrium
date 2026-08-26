import { motion } from 'framer-motion';
import './hiddenOptions.css';
import { useState } from 'react';
import AsitecOption from './asitecOption/AsitecOption';
import FeedOption from './feedOption/FeedOption';
import DutyOption from './dutyOption/DutyOption';
import AdvanceOption from './advanceOption/AdvanceOption';
import ToDoOption from './toDoOption/ToDoOption';
interface OptionsProps {
  visible: boolean;
  showCard: (e: boolean) => void;
  duty: number;
  CUI: string;
}
const HiddenOptions = ({ visible, showCard, duty, CUI }: OptionsProps) => {
  const [option, setOption] = useState<number>(0);
  return (
    <div className="ho-sub-options">
      <div className="ho-sub-header">
        <div className="ho-titles">
          <span
            className={`ho-sub ${option === 1 ? 'ho-selected' : 'ho-text'}`}
            onClick={() => {
              showCard(true);
              setOption(1);
            }}
          >
            Avances
          </span>
          <span
            className={`ho-sub ${option === 2 ? 'ho-selected' : 'ho-text'}`}
            onClick={() => {
              showCard(true);
              setOption(2);
            }}
          >
            Compromisos
          </span>
          <span
            className={`ho-sub ${option === 3 ? 'ho-selected' : 'ho-text'}`}
            onClick={() => {
              showCard(true);
              setOption(3);
            }}
          >
            Estado ASITEC
          </span>
          <span
            className={`ho-sub ${option === 4 ? 'ho-selected' : 'ho-text'}`}
            onClick={() => {
              showCard(true);
              setOption(4);
            }}
          >
            Pendientes
          </span>
          <span
            className={`ho-sub ${option === 5 ? 'ho-selected' : 'ho-text'}`}
            onClick={() => {
              showCard(true);
              setOption(5);
            }}
          >
            Observaciones
          </span>
        </div>
        {visible && (
          <span
            className="ho-close"
            onClick={() => {
              showCard(false);
              setOption(0);
            }}
          >
            Cerrar
          </span>
        )}
      </div>
      <motion.div
        className="ho-content"
        initial={{ opacity: 0, y: 50, height: visible ? 0 : 400 }}
        animate={{
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 50,
          height: visible ? 400 : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        {option === 1 && <AdvanceOption id={duty} CUI={CUI} />}
        {option === 2 && <DutyOption id={duty} />}
        {option === 3 && <AsitecOption id={duty} />}
        {option === 4 && <ToDoOption id={duty} />}
        {option === 5 && <FeedOption id={duty} />}
      </motion.div>
    </div>
  );
};

export default HiddenOptions;

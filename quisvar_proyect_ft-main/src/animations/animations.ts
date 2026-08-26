import type { Transition, Variants } from 'framer-motion';

export const dropIn: Variants = {
  hidden: {
    y: '-100vh',
    opacity: 0,
  },
  visible: {
    y: '0',
    opacity: 1,
    transition: {
      duration: 0.2,
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  leave: {
    opacity: 0,
    y: '-100vh',
  },
};

export const spring: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 30,
};

export const container = {
  hidden: {
    opacity: 0,
    transition: {
      delay: 0.5,
      duration: 0.3,
    },
  },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.5,
      staggerDirection: -1,
    },
  },
};

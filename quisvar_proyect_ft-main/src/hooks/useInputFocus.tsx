import { useContext } from 'react';
import { InputFocusContext } from '@/context/InputFocusContext';

const useInputFocus = () => {
  const context = useContext(InputFocusContext);
  if (!context) {
    throw new Error('useInputFocus must be used within an InputsProvider');
  }
  return context;
};

export default useInputFocus;

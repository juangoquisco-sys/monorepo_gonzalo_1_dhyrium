import { useLocation, useNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';

const useNavigateWithParams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithParams = (path: string, options: NavigateOptions = {}) => {
    const currentParams = new URLSearchParams(location.search);
    navigate(`${path}?${currentParams.toString()}`, options);
  };
  return navigateWithParams;
};

export default useNavigateWithParams;

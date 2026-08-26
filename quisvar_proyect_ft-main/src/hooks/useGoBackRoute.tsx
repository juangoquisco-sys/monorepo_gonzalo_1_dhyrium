import { useLocation, useNavigate } from 'react-router-dom';

const useGoBackRoute = (name: string = '') => {
  const location = useLocation();
  const navigate = useNavigate();
  const goBackRoute = () => {
    const currentPath = location.pathname;
    const newName = name ? `/${name}` : '';
    const regex = new RegExp(`${newName}/\\d+$`);
    const newPathname = currentPath.replace(regex, '');
    const newUrl = `${newPathname}${location.search || ''}`;
    navigate(newUrl);
  };
  return goBackRoute;
};

export default useGoBackRoute;

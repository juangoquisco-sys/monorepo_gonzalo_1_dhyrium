import { motion } from 'framer-motion';
import './Menu.css';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { MenuMoreInfo } from '@/types/types';

interface MenuProps {
  data: MenuMoreInfo[];
}

const Menu = ({ data }: MenuProps) => {
  const { profile } = useSelector((state: RootState) => state.userSession);

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="header-toggle"
    >
      <p className="fullname-menu">{profile.firstName} </p>
      <br className="line"></br>
      {data.map(
        value =>
          value.id !== 2 && (
            <motion.li
              key={value.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => value.action()}
              className="list-menu"
            >
              <img src={value.icon} alt="" className="icon-menu-left" />
              <p> {value.name}</p>
              <img
                src="/svg/material-symbols_navigate-next.svg"
                className="icon-menu-right"
              />
            </motion.li>
          )
      )}
    </motion.ul>
  );
};

export default Menu;

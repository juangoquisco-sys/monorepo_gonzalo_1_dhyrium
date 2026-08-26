import React, { type ReactNode } from 'react';
import './aside.css';

interface AsideProps {
  children: ReactNode;
}

const Aside: React.FC<AsideProps> = ({ children }) => {
  return <div className="aside">{children}</div>;
};

export default Aside;

import type { CSSProperties } from 'react';
import { getIconDefault } from '@/utils/tools';
import './iconProfile.css';

interface IconProfileProps {
  dni: string;
  size?: number;
}

const IconProfile = ({ dni, size = 2 }: IconProfileProps) => {
  const style: CSSProperties = {
    minWidth: `${size}rem`,
    minHeight: `${size}rem`,
  };
  return (
    <figure className="iconProfile-profile-figure" style={style}>
      <img src={getIconDefault(dni)} alt={dni} />
    </figure>
  );
};

export default IconProfile;

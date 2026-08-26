import { generateUniqueColorForDNI, getFirstLetterNames } from '@/utils/tools';
import './defaultUserImage.css';
import { useState } from 'react';

interface DefaultUserImageProps {
  user: {
    firstName: string;
    lastName: string;
    dni: string;
  };
}

const DefaultUserImage = ({ user }: DefaultUserImageProps) => {
  const { firstName, lastName, dni } = user;
  const [message, setMenssage] = useState(false);
  const showMessage = () => setMenssage(true);
  const hiddenMessage = () => setMenssage(false);
  const fistLetterNames = getFirstLetterNames(firstName, lastName);
  // const color = useMemo(() => colors[Math.floor(Math.random() * 11) + 1], []);
  const style = {
    backgroundColor: generateUniqueColorForDNI(dni),
  };
  return (
    <div className="defaultUserImage-contain">
      <div
        className="defaultUserImage"
        style={style}
        onMouseEnter={showMessage}
        onMouseLeave={hiddenMessage}
      >
        {fistLetterNames}
      </div>
      {message && (
        <span className="defaultUserImage-message">
          {firstName} {lastName}
        </span>
      )}
    </div>
  );
};

export default DefaultUserImage;

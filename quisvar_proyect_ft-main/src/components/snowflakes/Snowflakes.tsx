import { useState } from 'react';
import './snowflakes.css';
import CustomSwitch from '../customSwitch/CustomSwitch';
import Input from '../Input/Input';

const getRandomPosition = () => `${Math.random() * 100}%`;
const getRandomDelay = () => `${Math.random() * 5}s`;
const getRandomAnimationDuration = () => `${5 + Math.random() * 5}s`;

const Snowflakes = () => {
  const [number, setNumber] = useState('12');
  const [viewSnowflakes, setViewSnowflakes] = useState(true);

  const handleNumberChange = ({
    target,
  }: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = target.value.replace(/[^0-9]/, '');
    const number =
      +newValue[0] === 0 ? '0' : +newValue > 200 ? '200' : newValue;
    setNumber(number);
  };

  return (
    <div className="snowflakes" aria-hidden="true">
      {viewSnowflakes &&
        Array.from({ length: +number }).map((_, index) => (
          <div
            key={index}
            className="snowflake"
            style={{
              left: getRandomPosition(),
              animationDelay: getRandomDelay(),
            }}
          >
            <div
              className="inner"
              style={{
                animationDelay: getRandomDelay(),
                animationDuration: getRandomAnimationDuration(),
              }}
            >
              ❅
            </div>
          </div>
        ))}
      <div className="snowflakes-switch">
        <Input
          styleInput={3}
          width={2}
          value={number}
          onChange={handleNumberChange}
          autoFocus
        />
        <CustomSwitch
          isToggle={viewSnowflakes}
          onToggle={() => setViewSnowflakes(!viewSnowflakes)}
        />
      </div>
    </div>
  );
};

export default Snowflakes;

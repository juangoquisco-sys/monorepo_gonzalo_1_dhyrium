import type { CSSProperties } from 'react';

interface GeneralTitleProps {
  firstTitle: string;
  secondTitle?: string;
  fontSize?: number;
}

const GeneralTitle = ({
  firstTitle,
  secondTitle,
  fontSize = 1.6,
}: GeneralTitleProps) => {
  const style: CSSProperties = {
    fontSize: `${fontSize}rem`,
  };
  return (
    <h1 className="main-title" style={style}>
      {firstTitle} <span className="main-title-span">{secondTitle} </span>
    </h1>
  );
};

export default GeneralTitle;

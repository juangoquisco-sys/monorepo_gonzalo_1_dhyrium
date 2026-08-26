import { useEffect, useRef } from 'react';
interface ContainerScrollRefProps {
  className?: string;
  children: React.ReactNode;
  onClick?: (value: () => void) => void;
}
const ContainerScrollRef = ({
  children,
  className,
  onClick,
}: ContainerScrollRefProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickScroll = () => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    onClick?.(handleClickScroll);
  }, [onClick]);

  return (
    <div ref={ref} className={`${className}`}>
      {children}
    </div>
  );
};

export default ContainerScrollRef;

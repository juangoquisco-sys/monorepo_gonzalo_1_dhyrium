import type { ReactNode } from 'react';
import './recentProjectCard.css';
interface RecentProjectCardProps {
  headerText: string;
  title: string;
  footerText: string;
  icon: ReactNode;
  onCLick?: () => void;
}
const RecentProjectCard = ({
  footerText,
  headerText,
  title,
  icon: Icon,
  onCLick,
}: RecentProjectCardProps) => {
  return (
    <button
      className="RecentProcessCard-container"
      type="button"
      onClick={onCLick}
    >
      {Icon}
      <div className="RecentProcessCard-content">
        <p className="RecentProcessCard-header">{headerText}</p>
        <p className="RecentProcessCard-title">{title}</p>
        <p className="RecentProcessCard-footer">{footerText}</p>
      </div>
    </button>
  );
};

export default RecentProjectCard;

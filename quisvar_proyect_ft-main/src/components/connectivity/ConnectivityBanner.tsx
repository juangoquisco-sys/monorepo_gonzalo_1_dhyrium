import { RadioTower } from 'lucide-react';
import { getConnectivityIssue } from '@/services/connectivity';
import { useConnectivity } from '@/hooks/useConnectivity';
import './connectivityBanner.css';

export const ConnectivityBanner = () => {
  const connectivity = useConnectivity();
  const issue = getConnectivityIssue(connectivity);

  if (!issue || issue.type !== 'socket') return null;

  return (
    <div
      className="connectivity-banner connectivity-banner--socket"
      role="status"
      aria-live="polite"
    >
      <RadioTower className="connectivity-banner__icon" aria-hidden="true" />
      <div className="connectivity-banner__content">
        <strong>{issue.title}</strong>
        <span>{issue.message}</span>
      </div>
    </div>
  );
};

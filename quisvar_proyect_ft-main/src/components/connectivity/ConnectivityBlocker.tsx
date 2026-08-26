import { type KeyboardEvent, useEffect, useRef } from 'react';
import { RefreshCw, ServerOff } from 'lucide-react';
import { useConnectivityRetry } from '@/hooks/useConnectivityRetry';
import { CONNECTIVITY_MESSAGES } from './connectivityMessages';
import './connectivityBlocker.css';

export const ConnectivityBlocker = () => {
  const { isRetrying, retryConnection } = useConnectivityRetry();
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    retryButtonRef.current?.focus();
  };

  return (
    <div
      className="connectivity-blocker"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="connectivity-blocker-title"
      onKeyDown={handleKeyDown}
    >
      <section className="connectivity-blocker__panel">
        <ServerOff className="connectivity-blocker__icon" />
        <div className="connectivity-blocker__content">
          <h2 id="connectivity-blocker-title">
            {CONNECTIVITY_MESSAGES.backendUnavailable.title}
          </h2>
          <p>{CONNECTIVITY_MESSAGES.backendUnavailable.message}</p>
        </div>
        <button
          ref={retryButtonRef}
          type="button"
          className="connectivity-blocker__button"
          onClick={() => void retryConnection()}
          disabled={isRetrying}
          aria-busy={isRetrying}
        >
          <RefreshCw
            className={
              isRetrying
                ? 'connectivity-blocker__button-icon--loading'
                : undefined
            }
            aria-hidden="true"
          />
          {isRetrying
            ? CONNECTIVITY_MESSAGES.retry.checking
            : CONNECTIVITY_MESSAGES.retry.idle}
        </button>
      </section>
    </div>
  );
};

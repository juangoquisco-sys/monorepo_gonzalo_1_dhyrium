import type { ReactNode } from 'react';
import './messagePageContain.css';
const MessagePageContain = ({ children }: { children: ReactNode }) => {
  return (
    <div className="messagePageContain messagePageContain--right">
      {children}
    </div>
  );
};

export default MessagePageContain;

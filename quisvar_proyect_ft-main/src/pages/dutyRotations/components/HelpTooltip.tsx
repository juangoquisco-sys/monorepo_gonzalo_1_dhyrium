import { CircleHelp } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
}

const HelpTooltip = ({ text }: HelpTooltipProps) => (
  <span className="dutyRotations-help" tabIndex={0} aria-label={text}>
    <CircleHelp aria-hidden="true" />
    <span className="dutyRotations-helpBubble" role="tooltip">
      {text}
    </span>
  </span>
);

export default HelpTooltip;

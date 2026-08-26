import './summaryStat.css';

type SummaryStatVariant = 'primary' | 'secondary';
type SummaryStatTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface SummaryStatProps {
  label: string;
  value: string | number;
  variant?: SummaryStatVariant;
  tone?: SummaryStatTone;
}

const SummaryStat = ({
  label,
  value,
  variant = 'secondary',
  tone = 'neutral',
}: SummaryStatProps) => {
  return (
    <article
      className={`kitchenSummaryStat kitchenSummaryStat--${variant} kitchenSummaryStat--${tone}`}
    >
      <span className="kitchenSummaryStat-label">{label}</span>
      <strong className="kitchenSummaryStat-value">{value}</strong>
    </article>
  );
};

export default SummaryStat;

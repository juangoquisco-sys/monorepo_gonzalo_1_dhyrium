import './feedOption.css';
interface FeedOptionProps {
  id: number;
}
const FeedOption = ({ id }: FeedOptionProps) => {
  return <div>FeedOption {id}</div>;
};

export default FeedOption;

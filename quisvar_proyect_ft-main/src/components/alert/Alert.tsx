import './alert.css';

type Props = {
  typeAlert: string;
  message: string;
};

const Alert = (props: Props) => {
  function renderSucces() {
    return (
      <div className="popup success">
        <h1>Alert Success</h1>
        <p>{props.message}</p>
      </div>
    );
  }
  function renderError() {
    return (
      <div className="popup error">
        <h1>Alert Error</h1>
        <p>{props.message}</p>
      </div>
    );
  }
  return (
    <div>
      {props.typeAlert == 'success' && renderSucces()}
      {props.typeAlert == 'error' && renderError()}
    </div>
  );
};

export default Alert;

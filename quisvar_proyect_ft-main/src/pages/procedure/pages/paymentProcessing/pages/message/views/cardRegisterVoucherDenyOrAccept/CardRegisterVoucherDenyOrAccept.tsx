import { useContext } from 'react';
import ChipFileMessage from '../../../../components/chipFileMessage/ChipFileMessage';
import './cardRegisterVoucherDenyOrAccept.css';
import { MessageCardContext } from '../../components/messageCard/MessageCard';

const CardRegisterVoucherDenyOrAccept = () => {
  const { message } = useContext(MessageCardContext);

  // const handleDenyOrAccept = async (type: 'PAGADO' | 'FINALIZADO') => {
  //   axiosInstance.delete(`/paymail/voucher/${message.id}?status=${type}`);
  //   handleFinish();
  // };
  const { filesPay, rxhFile } = message;
  const historyFiles = filesPay.slice(0, -1);
  const lastFile = filesPay.slice(-1)[0];

  return (
    <div className="CardRegisterVoucherDenyOrAccept">
      <h3 className="CardRegisterVoucherDenyOrAccept-title">
        DOCUMENTOS FINALES RECIBIDOS
      </h3>
      <>
        <h3 className="CardRegisterVoucherDenyOrAccept-subTitle">
          Recibo por honorarios:
        </h3>
        <div className="CardRegisterVoucherDenyOrAccept-file">
          {rxhFile ? (
            <ChipFileMessage
              key={rxhFile.id}
              className="message-files-list"
              text={rxhFile.name}
              link={rxhFile.path + '/' + rxhFile.name}
            />
          ) : (
            <h3 className="CardRegisterVoucherDenyOrAccept-file-subtitle">
              Aun sin subir
            </h3>
          )}
        </div>
      </>
      {filesPay && (
        <>
          <h3 className="CardRegisterVoucherDenyOrAccept-subTitle">
            Recibo de pago y orden de servicio firmados:
          </h3>

          <div className="CardRegisterVoucherDenyOrAccept-file">
            <h3 className="CardRegisterVoucherDenyOrAccept-file-subtitle">
              {lastFile ? 'Ultimo:' : 'Aun sin subir'}
            </h3>
            <div className="inbox-container-file-grid">
              {lastFile?.files.map(file => (
                <ChipFileMessage
                  key={file.id}
                  className="message-files-list"
                  text={file.name}
                  link={file.path + '/' + file.name}
                />
              ))}
            </div>

            {historyFiles.length !== 0 && (
              <>
                <h3 className="CardRegisterVoucherDenyOrAccept-file-subtitle">
                  Anteriores:
                </h3>
                <div className="CardRegisterVoucherDenyOrAccept-container-last-files scroll-slim">
                  {historyFiles.map(history => (
                    <div
                      key={history.files[0].id}
                      className="inbox-container-file-grid"
                    >
                      {history.files.map(file => (
                        <ChipFileMessage
                          key={file.id}
                          className="message-files-list"
                          text={file.name}
                          link={file.path + '/' + file.name}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* {viewBotton && (
        <div className="CardRegisterVoucherDenyOrAccept-btns">
          <Button
            text="Aceptar"
            className="messagePage-btn-submit"
            icon="check-white"
            imageStyle="CardRegisterVoucherDenyOrAccept-icon"
            onClick={() => handleDenyOrAccept('PAGADO')}
            />
            <Button
            text="Denegar"
            className="messagePage-btn-submit  btn-submit--red"
            imageStyle="CardRegisterVoucherDenyOrAccept-icon"
            icon="close-white"
            onClick={() => handleDenyOrAccept('FINALIZADO')}
            />
            </div>
            )} */}
        </>
      )}
    </div>
  );
};

export default CardRegisterVoucherDenyOrAccept;

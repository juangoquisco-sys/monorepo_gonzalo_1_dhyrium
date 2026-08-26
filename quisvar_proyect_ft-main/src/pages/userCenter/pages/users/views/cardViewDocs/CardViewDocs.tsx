import './CardViewDocs.css';
import { useEffect, useRef, useState } from 'react';
import { isOpenViewDocs$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';
import type { TypeFileUser, User } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Modal from '@/components/portal/Modal';
import UploadUserFile from '../../components/uploadUserFile/UploadUserFile';
import CardGenerateContract from '../cardGenerateContract/CardGenerateContract';

interface UserDocument {
  [key: string]: {
    fileNames: string[];
    typeFile: TypeFileUser;
  };
}

interface CardViewDocsProps {
  onUserUpdated?: () => void | Promise<void>;
}

const CardViewDocs = ({ onUserUpdated }: CardViewDocsProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const updateUser = () => {
    axiosInstance.get(`/users/${user?.id}`).then(res => {
      setUser(res.data);
      void onUserUpdated?.();
    });
  };

  const closeFunctions = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    handleIsOpen.current = isOpenViewDocs$.getSubject.subscribe(data => {
      const { isOpen, user } = data;
      setUser(user);
      setIsOpen(isOpen);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  const dataDocuments: UserDocument = {
    ['Curriculum Vitae:']: {
      fileNames: user?.cv ? [user.cv] : [],
      typeFile: 'cv',
    },
    ['Declaración Jurada:']: {
      fileNames: user?.declaration ? [user.declaration] : [],
      typeFile: 'declaration',
    },
    ['Contrato:']: {
      fileNames: user?.contract ?? [],
      typeFile: 'contract',
    },
    ['Declaracion Jurada al retirarse:']: {
      fileNames: user?.withdrawalDeclaration
        ? [user.withdrawalDeclaration]
        : [],
      typeFile: 'withdrawalDeclaration',
    },
  };

  return (
    <Modal size={50} isOpenProp={isOpen}>
      <div className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1>Documentos</h1>
        <h6>
          {user?.profile.firstName} {user?.profile.lastName}
        </h6>
        <div className="vd-docs-area">
          {Object.entries(dataDocuments).map(
            ([key, { fileNames, typeFile }]) => (
              <div key={key} className="vd-list-text">
                <label>{key}</label>
                <div className="vd-file-list">
                  {fileNames.map(fileName => (
                    <UploadUserFile
                      key={fileName}
                      fileName={fileName}
                      typeFile={typeFile}
                      userId={user?.id}
                      onSave={updateUser}
                    />
                  ))}
                  {(typeFile === 'contract' || fileNames.length === 0) && (
                    <UploadUserFile
                      fileName=""
                      typeFile={typeFile}
                      userId={user?.id}
                      onSave={updateUser}
                    />
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
      {user && <CardGenerateContract user={user} onSave={updateUser} />}
    </Modal>
  );
};

export default CardViewDocs;

import { useEffect, useRef, useState } from 'react';
import './videoPlayer.css';
import Modal from '@/components/portal/Modal';
import { isOpenVideoPlayer$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';
import { RiCloseCircleFill } from 'react-icons/ri';
import useKey from '@/hooks/useKey';

const VideoPlayer = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [url, setUrl] = useState<string>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    handleIsOpen.current = isOpenVideoPlayer$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setUrl(value.url);
    });

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const closeFunctions = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsOpen(false);
    setUrl('');
  };

  useKey('Escape', () => closeFunctions());

  useKey('F12', event => {
    event.preventDefault();
    alert(
      'Otro intento y se agregara una multa de s/. 100.00 por vulnerabilidad de sistema'
    );
  });

  return (
    <Modal size={50} isOpenProp={isOpen}>
      <div className="videoPlayer-main">
        <RiCloseCircleFill
          color="white"
          onClick={closeFunctions}
          className="videoPlayer-close"
          size={20}
        />
        <div className="videoPlayer-container">
          <video
            ref={videoRef}
            className="videoPlayer-element"
            src={url}
            controls
            controlsList="nodownload"
            preload="metadata"
          >
            Tu navegador no soporta la reproduccion de video.
          </video>
        </div>
      </div>
    </Modal>
  );
};

export default VideoPlayer;

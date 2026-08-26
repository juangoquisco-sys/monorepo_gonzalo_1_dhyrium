import Navigation from '@/routes/Navigation';
import Loader from '@/components/loader/Loader';
import { SnackbarUtilitiesConfigurator } from '@/utils/SnackbarManager';
import { ConnectivityBanner } from '@/components/connectivity/ConnectivityBanner';
import { GlobalDialog } from '@/components/app-ui/GlobalDialog';
import DownloadProgress from '@/components/downloadProgress/DownloadProgress';

function App() {
  return (
    <>
      <SnackbarUtilitiesConfigurator />
      <GlobalDialog />
      <ConnectivityBanner />
      <Navigation />
      <Loader />
      <DownloadProgress />
    </>
  );
}

export default App;

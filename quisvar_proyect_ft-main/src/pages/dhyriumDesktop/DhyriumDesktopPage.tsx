import { useState } from 'react';
import { Check, Copy, Download, MonitorCog, ShieldCheck } from 'lucide-react';
import './dhyriumDesktopPage.css';

const DESKTOP_PILOT_DOWNLOAD =
  import.meta.env.VITE_DHYRIUM_DESKTOP_DOWNLOAD_URL ||
  '/desktop/DhyriumDesktop-0.1.4-win-x64-pilot.zip';

const DhyriumDesktopPage = () => {
  const [copied, setCopied] = useState(false);
  const serverUrl = window.location.origin;

  const copyServerUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(serverUrl);
      } else {
        const copyField = document.createElement('textarea');
        copyField.value = serverUrl;
        copyField.setAttribute('readonly', '');
        copyField.style.position = 'fixed';
        copyField.style.opacity = '0';
        document.body.append(copyField);
        copyField.select();
        const didCopy = document.execCommand('copy');
        copyField.remove();

        if (!didCopy) {
          throw new Error('No se pudo copiar la dirección.');
        }
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="dhyrium-desktop-page">
      <section className="dhyrium-desktop-card" aria-labelledby="desktop-title">
        <div className="dhyrium-desktop-heading">
          <span className="dhyrium-desktop-icon" aria-hidden="true">
            <MonitorCog />
          </span>
          <div>
            <p className="dhyrium-desktop-kicker">Herramienta de escritorio</p>
            <h1 id="desktop-title">Dhyrium Desktop</h1>
            <p>
              Abra archivos de Dhyrium con AutoCAD, Revit, Word, Excel, S10 y
              las demás aplicaciones instaladas en su computadora.
            </p>
          </div>
        </div>

        <div className="dhyrium-desktop-notice">
          <ShieldCheck aria-hidden="true" />
          <span>
            Prueba interna: Dhyrium conserva el archivo y crea una nueva versión
            cada vez que usted guarda desde la aplicación local.
          </span>
        </div>

        <ol className="dhyrium-desktop-steps">
          <li>
            <strong>Descargue la herramienta.</strong>
            <span>
              Versión 0.1.4: corrige el seguimiento del guardado de AutoCAD y
              conserva los cambios como versiones en Dhyrium.
            </span>
            <a
              className="dhyrium-desktop-download"
              href={DESKTOP_PILOT_DOWNLOAD}
              download
            >
              <Download aria-hidden="true" />
              Descargar Dhyrium Desktop para Windows
            </a>
          </li>
          <li>
            <strong>Extraiga el archivo y ejecute Dhyrium Desktop.</strong>
            <span>
              Ingrese con el mismo usuario y contraseña que utiliza en Dhyrium
              Web. La contraseña no queda guardada en el programa.
            </span>
          </li>
          <li>
            <strong>Indique esta dirección del servidor.</strong>
            <span>
              Use la dirección que aparece aquí; no use “localhost” salvo que el
              servidor sea esta misma computadora.
            </span>
            <div className="dhyrium-desktop-server-url">
              <code>{serverUrl}</code>
              <button type="button" onClick={() => void copyServerUrl()}>
                {copied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
          </li>
          <li>
            <strong>Vuelva a una tarea y pulse un archivo.</strong>
            <span>
              Dhyrium Desktop abrirá el programa correspondiente de Windows y
              enviará los guardados de vuelta a Dhyrium como versiones.
            </span>
          </li>
        </ol>

        <p className="dhyrium-desktop-footnote">
          Funciona prioritariamente en la red local y también desde fuera cuando
          se accede a Dhyrium mediante una dirección segura de la empresa.
        </p>
      </section>
    </main>
  );
};

export default DhyriumDesktopPage;

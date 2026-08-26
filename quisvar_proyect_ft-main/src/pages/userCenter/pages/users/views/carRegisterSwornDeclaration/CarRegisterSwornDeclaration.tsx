import { PDFDownloadLink } from '@react-pdf/renderer';
import type { GeneralFile, RoleForm } from '@/types/types';
import './carRegisterSwornDeclaration.css';
import SwornDeclarationPdf from '../../pdfGenerator/swornDeclarationPdf/SwornDeclarationPdf';
import { deleteExtension } from '@/utils/tools';
import { useForm } from 'react-hook-form';
import type { SwornDeclaration, UserForm } from '../../models/types';
import Button from '@/components/button/Button';

interface CarRegisterSwornDeclarationProps {
  generalFiles: GeneralFile[] | null;
  userData: UserForm;
  roles: RoleForm[];
  embedded?: boolean;
}

const CarRegisterSwornDeclaration = ({
  generalFiles,
  userData,
  roles,
  embedded = false,
}: CarRegisterSwornDeclarationProps) => {
  const { register, watch } = useForm<SwornDeclaration>();
  const roleName = () => {
    const selectRole = roles?.find(role => role.id === userData.roleId);
    if (!selectRole) return '';
    return selectRole.name;
  };
  const swornDeclarationData = {
    ...watch(),
    ...userData,
    roleName: roleName(),
  };
  const declarationType = watch('typeDeclaration');

  const directivesPicker = (
    <div className="card-register-sworn-declaration-directives-picker">
      <label className="card-register-sworn-declaration-select">
        <input
          type="checkbox"
          className="card-register-dropdown-check"
          defaultChecked={false}
        />
        <span>Seleccionar directivas</span>
        <img
          src="/svg/down.svg"
          className="card-register-sworn-declaration-arrow"
          alt=""
        />
      </label>
      <div className="card-register-sworn-declaration-dropdown-content">
        <ul className="card-register-sworn-declaration-dropdown-sub">
          {generalFiles?.map(generalFile => (
            <label
              key={generalFile.id}
              className="card-register-sworn-declaration-check-container"
            >
              <input
                type="checkbox"
                value={generalFile.name}
                {...register('declarations', {
                  value: [],
                })}
              />
              {deleteExtension(generalFile.name)}
            </label>
          ))}
        </ul>
      </div>
    </div>
  );

  const declarationAction = (text: string) => (
    <PDFDownloadLink
      document={<SwornDeclarationPdf data={swornDeclarationData} />}
      fileName="Declaracion-Jurada1.pdf"
    >
      <Button
        icon="preview-pdf"
        text={text}
        full
        fontWeight={500}
        borderRadius={3}
        color="grayLigth"
        textColor="grayTertiary"
        borderColor="graySecondary"
      />
    </PDFDownloadLink>
  );

  if (embedded) {
    return (
      <section className="card-register-sworn-declaration card-register-sworn-declaration--embedded">
        <div className="card-register-sworn-declaration-embedded-header">
          <div>
            <h2 className="card-register-sworn-declaration-title">
              Generar declaración jurada
            </h2>
            <p>
              Complete los datos necesarios para generar el PDF de la
              declaración.
            </p>
          </div>
        </div>

        <div
          className={`card-register-sworn-declaration-embedded-grid${
            declarationType === 'technical'
              ? ' card-register-sworn-declaration-embedded-grid--with-months'
              : ''
          }`}
        >
          <fieldset className="card-register-sworn-declaration-field card-register-sworn-declaration-field--type">
            <legend>Tipo de declaración</legend>
            <div className="card-register-radio-container">
              <label className="card-register-radio-input">
                <input
                  type="radio"
                  id="technical"
                  value="technical"
                  {...register('typeDeclaration')}
                  name="typeDeclaration"
                />
                <span className="card-register-radio-input-text">Técnico</span>
              </label>
              <label className="card-register-radio-input">
                <input
                  type="radio"
                  id="administrative"
                  value="administrative"
                  {...register('typeDeclaration')}
                  name="typeDeclaration"
                />
                <span className="card-register-radio-input-text">
                  Administrativo
                </span>
              </label>
            </div>
          </fieldset>

          <label className="card-register-sworn-declaration-field">
            <span>Fecha</span>
            <input
              id="sworn-declaration-date"
              {...register('declarationDate', {
                valueAsDate: true,
              })}
              type="date"
              className="generalData-edit-info-input"
            />
          </label>

          {declarationType === 'technical' && (
            <label className="card-register-sworn-declaration-field">
              <span>Número de meses</span>
              <input
                type="number"
                {...register('declarationMonths')}
                name="declarationMonths"
                placeholder="4"
                className="generalData-edit-info-input"
              />
            </label>
          )}

          <div className="card-register-sworn-declaration-field card-register-sworn-declaration-field--directives">
            <span>Directivas</span>
            {directivesPicker}
          </div>

          <div className="card-register-sworn-declaration-actions">
            {declarationAction('Generar declaración jurada')}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="card-register-sworn-declaration">
      <h2 className="card-register-sworn-declaration-title">
        Generar declaración jurada
      </h2>
      <h4 className="card-register-sworn-declaration-subtitle">
        Seleccionar tipo
      </h4>
      <div className="card-register-radio-container">
        <label className="card-register-radio-input">
          <input
            type="radio"
            id="technical"
            value="technical"
            {...register('typeDeclaration')}
            name="typeDeclaration"
          />
          <span className="card-register-radio-input-text">Técnico</span>
        </label>
        <label className="card-register-radio-input">
          <input
            type="radio"
            id="administrative"
            value="administrative"
            {...register('typeDeclaration')}
            name="typeDeclaration"
          />
          <span className="card-register-radio-input-text">Administrativo</span>
        </label>
      </div>
      <h4 className="card-register-sworn-declaration-subtitle">Fecha</h4>

      <input
        {...register('declarationDate', {
          valueAsDate: true,
        })}
        type="date"
        placeholder="Fecha"
        className="generalData-edit-info-input"
      />
      {declarationType === 'technical' && (
        <>
          <h4 className="card-register-sworn-declaration-subtitle">
            Número de meses
          </h4>
          <input
            type="number"
            {...register('declarationMonths')}
            name="declarationMonths"
            placeholder="4"
            className="generalData-edit-info-input"
          />
        </>
      )}
      <h4 className="card-register-sworn-declaration-subtitle">
        Directivas
      </h4>
      {directivesPicker}
      {declarationAction('Declaración jurada')}
    </div>
  );
};

export default CarRegisterSwornDeclaration;

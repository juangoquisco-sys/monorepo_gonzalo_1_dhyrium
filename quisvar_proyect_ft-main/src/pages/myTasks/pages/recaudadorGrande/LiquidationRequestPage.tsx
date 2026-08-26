import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Attach24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppSelect } from '@/components/app-ui/app-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getHtmlPdfBlob } from '@/utils/htmlToString';
import { formatAmountMoneyPEN } from '@/utils/tools';
import {
  DEFAULT_LIQUIDATION_DESCRIPTION,
  RECAUDADOR_GRANDE_ROUTES,
} from './recaudadorGrande.constants';
import { getRecaudadorGrandeErrorMessage } from './recaudadorGrande.errors';
import {
  useCreateLiquidationRequest,
  useEligibleLiquidationStages,
  useLiquidationPreview,
} from './recaudadorGrande.queries';
import { LiquidationScopeTable } from './LiquidationScopeTable';
import {
  RecaudadorGrandeLoading,
  RecaudadorGrandeState,
} from './RecaudadorGrandeState';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const LiquidationRequestPage = () => {
  const navigate = useNavigate();
  const { profile } = useSelector((state: RootState) => state.userSession);
  const [stageId, setStageId] = useState<number | null>(null);
  const [description, setDescription] = useState(
    DEFAULT_LIQUIDATION_DESCRIPTION
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const eligibleQuery = useEligibleLiquidationStages();
  const previewQuery = useLiquidationPreview(stageId);
  const createMutation = useCreateLiquidationRequest();
  const selectedStage = useMemo(
    () => eligibleQuery.data?.find(stage => stage.id === stageId),
    [eligibleQuery.data, stageId]
  );
  const title = selectedStage
    ? `Solicitud de liquidación - ${selectedStage.project.name ?? 'Proyecto'} ${
        selectedStage.name
      }`
    : 'Solicitud de liquidación';

  const handleSubmit = async () => {
    if (!stageId || !selectedStage || !previewQuery.data) {
      SnackbarUtilities.warning('Seleccione una etapa liquidable.');
      return;
    }

    const applicant = `${profile.firstName} ${profile.lastName}`.trim();
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6;">
        <h2>${escapeHtml(title)}</h2>
        <p><strong>Solicitante:</strong> ${escapeHtml(applicant)}</p>
        <p><strong>Proyecto:</strong> ${escapeHtml(
          selectedStage.project.name ?? ''
        )}</p>
        <p><strong>Etapa:</strong> ${escapeHtml(selectedStage.name)}</p>
        <p><strong>Monto bruto:</strong> ${escapeHtml(
          formatAmountMoneyPEN(previewQuery.data.grossAmount)
        )}</p>
        <hr />
        <p>${escapeHtml(description).replace(/\n/g, '<br />')}</p>
      </div>`;

    try {
      const mainProcedure = await getHtmlPdfBlob(html, 'a4', title);
      const result = await createMutation.mutateAsync({
        stageId,
        title,
        header: title,
        description: html,
        mainProcedure,
        attachments,
      });
      SnackbarUtilities.success('Solicitud de liquidación creada.');
      navigate(`/mis-reportes/${result.report.id}`);
    } catch (error) {
      SnackbarUtilities.error(getRecaudadorGrandeErrorMessage(error));
    }
  };

  return (
    <main className="grid gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Nueva solicitud de liquidación
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Seleccione una etapa con conformidad para revisar el sustento y enviar
          el trámite.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <AppSelect
            data={eligibleQuery.data}
            disabled={eligibleQuery.isLoading}
            extractValue={stage => stage.id}
            id="liquidation-stage"
            label="Etapa a liquidar"
            name="liquidation-stage"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setStageId(event.target.value ? Number(event.target.value) : null)
            }
            placeholder={
              eligibleQuery.isLoading
                ? 'Cargando etapas...'
                : 'Seleccione una etapa'
            }
            renderTextField={stage =>
              `${stage.project.name ?? 'Proyecto'} - ${stage.name} (CUI ${
                stage.project.contract.cui
              })`
            }
            value={stageId ?? ''}
          />
        </CardContent>
      </Card>

      {eligibleQuery.isError ? (
        <RecaudadorGrandeState
          title="No se pudieron cargar las etapas liquidables"
          description={getRecaudadorGrandeErrorMessage(eligibleQuery.error)}
          onRetry={() => void eligibleQuery.refetch()}
        />
      ) : previewQuery.isLoading ? (
        <RecaudadorGrandeLoading label="Calculando liquidación..." />
      ) : previewQuery.isError ? (
        <RecaudadorGrandeState
          title="No se pudo calcular la liquidación"
          description={getRecaudadorGrandeErrorMessage(previewQuery.error)}
          onRetry={() => void previewQuery.refetch()}
        />
      ) : !stageId ? (
        <RecaudadorGrandeState
          title={
            eligibleQuery.data?.length
              ? 'Seleccione una etapa'
              : 'Aún no hay etapas con conformidad'
          }
          description={
            eligibleQuery.data?.length
              ? 'El sustento y el monto liquidable aparecerán aquí.'
              : 'Complete primero la revisión técnica desde Pre-liquidación.'
          }
        />
      ) : null}

      {previewQuery.data && (
        <>
          <LiquidationScopeTable items={previewQuery.data.items} />
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total liquidable
                </p>
                <strong className="text-2xl text-foreground">
                  {formatAmountMoneyPEN(previewQuery.data.grossAmount)}
                </strong>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                Los adelantos pendientes se conciliarán en planilla durante la
                revisión de Gerencia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Datos de la solicitud</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="liquidation-description">
                  Descripción del trámite
                </Label>
                <Textarea
                  id="liquidation-description"
                  rows={5}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="liquidation-files">Adjuntos opcionales</Label>
                <label
                  className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 text-sm text-muted-foreground hover:bg-muted"
                  htmlFor="liquidation-files"
                >
                  <Attach24Regular aria-hidden />
                  Seleccionar archivos PDF
                </label>
                <input
                  id="liquidation-files"
                  className="sr-only"
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={event =>
                    setAttachments(Array.from(event.target.files ?? []))
                  }
                />
                {!!attachments.length && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(file => (
                      <AppBadge
                        key={`${file.name}-${file.lastModified}`}
                        variant="outline"
                      >
                        {file.name}
                      </AppBadge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <AppButton
                  variant="ghost"
                  onClick={() =>
                    navigate(RECAUDADOR_GRANDE_ROUTES.preLiquidation)
                  }
                >
                  Cancelar
                </AppButton>
                <AppButton
                  disabled={
                    createMutation.isPending ||
                    previewQuery.data.items.length === 0
                  }
                  onClick={() => void handleSubmit()}
                >
                  <CheckmarkCircle24Regular aria-hidden />
                  {createMutation.isPending
                    ? 'Enviando...'
                    : 'Enviar solicitud'}
                </AppButton>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
};

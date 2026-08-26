import { expect, test } from '@playwright/test';

interface CommandCase {
  id: string;
  payload?: unknown;
  expectedOwner: 'command' | 'action';
  expectedName: string;
}

const commandCases: CommandCase[] = [
  { id: 'home.clipboard.paste', expectedOwner: 'command', expectedName: 'executePaste' },
  { id: 'home.clipboard.cut', expectedOwner: 'command', expectedName: 'executeCut' },
  { id: 'home.clipboard.copy', expectedOwner: 'command', expectedName: 'executeCopy' },
  { id: 'home.clipboard.formatPainter', expectedOwner: 'command', expectedName: 'executePainter' },
  { id: 'home.font.family', payload: 'Carlito', expectedOwner: 'command', expectedName: 'executeFont' },
  { id: 'home.font.size', payload: 12, expectedOwner: 'command', expectedName: 'executeSize' },
  { id: 'home.font.grow', expectedOwner: 'command', expectedName: 'executeSizeAdd' },
  { id: 'home.font.shrink', expectedOwner: 'command', expectedName: 'executeSizeMinus' },
  { id: 'home.font.changeCase', payload: 'upper', expectedOwner: 'action', expectedName: 'changeCase' },
  { id: 'home.font.clear', expectedOwner: 'command', expectedName: 'executeFormat' },
  { id: 'home.font.bold', expectedOwner: 'command', expectedName: 'executeBold' },
  { id: 'home.font.italic', expectedOwner: 'command', expectedName: 'executeItalic' },
  { id: 'home.font.underline', expectedOwner: 'command', expectedName: 'executeUnderline' },
  { id: 'home.font.strike', expectedOwner: 'command', expectedName: 'executeStrikeout' },
  { id: 'home.font.subscript', expectedOwner: 'command', expectedName: 'executeSubscript' },
  { id: 'home.font.superscript', expectedOwner: 'command', expectedName: 'executeSuperscript' },
  { id: 'home.font.color', payload: '#123456', expectedOwner: 'command', expectedName: 'executeColor' },
  { id: 'home.font.highlight', payload: '#ffee00', expectedOwner: 'command', expectedName: 'executeHighlight' },
  { id: 'home.paragraph.bullets', payload: 'disc', expectedOwner: 'command', expectedName: 'executeList' },
  { id: 'home.paragraph.numbering', payload: 'decimal', expectedOwner: 'command', expectedName: 'executeList' },
  { id: 'home.paragraph.sort', expectedOwner: 'action', expectedName: 'sortSelection' },
  { id: 'home.paragraph.marks', expectedOwner: 'action', expectedName: 'toggleFormattingMarks' },
  { id: 'home.paragraph.alignLeft', expectedOwner: 'command', expectedName: 'executeRowFlex' },
  { id: 'home.paragraph.alignCenter', expectedOwner: 'command', expectedName: 'executeRowFlex' },
  { id: 'home.paragraph.alignRight', expectedOwner: 'command', expectedName: 'executeRowFlex' },
  { id: 'home.paragraph.justify', expectedOwner: 'command', expectedName: 'executeRowFlex' },
  { id: 'home.paragraph.spacing', payload: 1.5, expectedOwner: 'command', expectedName: 'executeRowMargin' },
  { id: 'home.styles.gallery', payload: 'heading-1', expectedOwner: 'action', expectedName: 'applyStyle' },
  { id: 'home.editing.find', expectedOwner: 'action', expectedName: 'openEditing' },
  { id: 'home.editing.replace', expectedOwner: 'action', expectedName: 'openEditing' },
  { id: 'home.editing.select', expectedOwner: 'command', expectedName: 'executeSelectAll' },
  { id: 'home.editing.search.next', payload: 'texto', expectedOwner: 'action', expectedName: 'searchNext' },
  { id: 'home.editing.replace.current', payload: ['texto', 'cambio'], expectedOwner: 'action', expectedName: 'replaceCurrent' },
  { id: 'home.editing.close', expectedOwner: 'action', expectedName: 'closeEditing' },
];

const intentionallyDisabledCommandIds = [
  'home.paragraph.multilevel',
  'home.paragraph.outdent',
  'home.paragraph.indent',
  'home.paragraph.shading',
  'home.paragraph.borders',
];

test('Hito 01: cada comando de Inicio ejecuta una acción real o queda deshabilitado con motivo', async ({ page }) => {
  await page.goto('/');

  const audit = await page.evaluate(async cases => {
    const moduleRoot = '/src/pages/specialities/pages/project/pages/task/components/taskDocumentEditor/ribbon';
    const [{ EditorStateAdapter }, { createHomeCommandRegistry }, { homeGroups }, { writerIconRegistry }] = await Promise.all([
      import(/* @vite-ignore */ `${moduleRoot}/EditorStateAdapter.ts`),
      import(/* @vite-ignore */ `${moduleRoot}/homeCommandRegistry.ts`),
      import(/* @vite-ignore */ `${moduleRoot}/RibbonSchema.ts`),
      import(/* @vite-ignore */ `${moduleRoot}/IconRegistry.ts`),
    ]);

    const invocations: Array<{ owner: 'command' | 'action'; name: string; args: unknown[] }> = [];
    const command = new Proxy<Record<string, unknown>>({}, {
      get: (_target, property) => {
        if (property === 'getRangeText') return () => 'Texto seleccionado';
        if (property === 'getRange') return () => ({ startIndex: 0, endIndex: 2 });
        if (property === 'getRangeContext') {
          return () => ({
            selectionElementList: [
              { value: 'Texto ', bold: true },
              { value: 'seleccionado', bold: false },
            ],
          });
        }
        return (...args: unknown[]) => {
          invocations.push({ owner: 'command', name: String(property), args });
        };
      },
    });
    const actions = new Proxy<Record<string, unknown>>({}, {
      get: (_target, property) => (...args: unknown[]) => {
        invocations.push({ owner: 'action', name: String(property), args });
      },
    });
    const context = {
      adapter: new EditorStateAdapter({ command }, { listType: 'ul' }),
      showFormattingMarks: false,
      actions,
    };
    const registry = createHomeCommandRegistry(context);
    const schemaCommandIds = homeGroups.flatMap((group: { controls: Array<{ commandId: string }> }) =>
      group.controls.map(control => control.commandId),
    );
    const duplicateIds = schemaCommandIds.filter((id: string, index: number) => schemaCommandIds.indexOf(id) !== index);
    const missingCases = schemaCommandIds.filter((id: string) =>
      !cases.executable.some(item => item.id === id) && !cases.disabled.includes(id),
    );
    const missingIconIds = homeGroups
      .flatMap((group: { controls: Array<{ icon: string }> }) => group.controls.map(control => control.icon))
      .filter((iconId: string, index: number, collection: string[]) =>
        collection.indexOf(iconId) === index && !writerIconRegistry.has(iconId),
      );
    const missingMetadata = schemaCommandIds.filter((id: string) => {
      const definition = registry.get(id);
      return !definition?.label || !definition.tooltip || !definition.keyTip || !definition.undoTransaction;
    });
    const executionFailures: string[] = [];

    for (const commandCase of cases.executable) {
      invocations.length = 0;
      if (!registry.canExecute(commandCase.id, commandCase.payload)) {
        executionFailures.push(`${commandCase.id}: canExecute=false`);
        continue;
      }
      const executed = await registry.execute(commandCase.id, commandCase.payload);
      const invoked = invocations.some(item =>
        item.owner === commandCase.expectedOwner && item.name === commandCase.expectedName,
      );
      if (!executed || !invoked) {
        executionFailures.push(`${commandCase.id}: execute=${String(executed)}, invocation=${String(invoked)}`);
      }
    }

    const invalidDisabledCommands: string[] = [];
    for (const commandId of cases.disabled) {
      invocations.length = 0;
      const executed = await registry.execute(commandId);
      if (registry.canExecute(commandId) || !registry.disabledReason(commandId) || executed || invocations.length > 0) {
        invalidDisabledCommands.push(commandId);
      }
    }

    const unavailableRegistry = createHomeCommandRegistry({
      adapter: new EditorStateAdapter(null, {}),
      showFormattingMarks: false,
      actions,
    });
    const unprotectedCommands = unavailableRegistry.entries()
      .filter((definition: { id: string }) =>
        unavailableRegistry.canExecute(definition.id) || !unavailableRegistry.disabledReason(definition.id),
      )
      .map((definition: { id: string }) => definition.id);

    const mixedBoldState = context.adapter.booleanState('bold');
    return {
      duplicateIds,
      executionFailures,
      invalidDisabledCommands,
      missingCases,
      missingIconIds,
      missingMetadata,
      mixedBoldState,
      schemaCommandCount: schemaCommandIds.length,
      unprotectedCommands,
    };
  }, { executable: commandCases, disabled: intentionallyDisabledCommandIds });

  expect(audit.schemaCommandCount).toBe(36);
  expect(audit.duplicateIds).toEqual([]);
  expect(audit.missingCases).toEqual([]);
  expect(audit.missingIconIds).toEqual([]);
  expect(audit.missingMetadata).toEqual([]);
  expect(audit.executionFailures).toEqual([]);
  expect(audit.invalidDisabledCommands).toEqual([]);
  expect(audit.unprotectedCommands).toEqual([]);
  expect(audit.mixedBoldState).toMatchObject({ active: false, mixed: true });
});

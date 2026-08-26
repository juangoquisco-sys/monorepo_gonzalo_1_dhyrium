import { z } from 'zod';
import { TASK_DOCUMENT_ASSET_FILE_NAME_PATTERN } from './taskDocumentAssets.domain';

export const taskDocumentKindSchema = z.enum(['subtasks', 'basictasks']);

const taskParamsSchema = z
  .object({
    taskKind: taskDocumentKindSchema,
    taskId: z.coerce.number().int().positive(),
  })
  .strict();

const tiptapDocumentSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();

const canvasEditorDocumentSchema = z
  .object({
    type: z.literal('canvas-editor'),
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    editorVersion: z.string().trim().min(1).max(40),
    data: z
      .object({
        header: z.array(z.unknown()).optional(),
        main: z.array(z.unknown()),
        footer: z.array(z.unknown()).optional(),
        graffiti: z.array(z.unknown()).optional(),
      })
      .strict(),
    settings: z
      .object({
        width: z.number().positive().max(5_000).optional(),
        height: z.number().positive().max(5_000).optional(),
        margins: z
          .tuple([
            z.number().nonnegative(),
            z.number().nonnegative(),
            z.number().nonnegative(),
            z.number().nonnegative(),
          ])
          .optional(),
        headerTop: z.number().nonnegative().max(5_000).optional(),
        footerBottom: z.number().nonnegative().max(5_000).optional(),
        paperDirection: z.enum(['vertical', 'horizontal']).optional(),
        pageMode: z.enum(['paging', 'continuity']).optional(),
        columns: z
          .object({
            count: z.number().int().min(1).max(6),
            gap: z.number().nonnegative().optional(),
            separator: z.boolean().optional(),
            separatorColor: z.string().max(40).optional(),
            separatorWidth: z.number().nonnegative().optional(),
          })
          .strict()
          .nullable()
          .optional(),
        backgroundColor: z.string().max(40).optional(),
        pageBorder: z
          .object({
            color: z.string().max(40).optional(),
            lineWidth: z.number().nonnegative().max(20).optional(),
            disabled: z.boolean().optional(),
          })
          .strict()
          .optional(),
        docxZonesImported: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const taskDocumentContentSchema = z.union([
  tiptapDocumentSchema,
  canvasEditorDocumentSchema,
]);

export const getTaskDocumentRequestSchema = z.object({
  params: taskParamsSchema,
});

export const getTaskDocumentAssetRequestSchema = z.object({
  params: taskParamsSchema.extend({
    fileName: z.string().regex(TASK_DOCUMENT_ASSET_FILE_NAME_PATTERN),
  }),
});

export const saveTaskDocumentRequestSchema = z.object({
  params: taskParamsSchema,
  body: z
    .object({
      title: z.string().trim().max(300),
      contentJson: taskDocumentContentSchema,
      contentHtml: z.string().max(6_000_000),
      plainText: z.string().max(1_000_000),
      expectedRevision: z.number().int().nonnegative().nullable(),
      createVersion: z.boolean().default(false),
    })
    .strict(),
});

export const listTaskDocumentVersionsRequestSchema = z.object({
  params: taskParamsSchema,
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
});

export const restoreTaskDocumentVersionRequestSchema = z.object({
  params: taskParamsSchema.extend({
    versionNumber: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      expectedRevision: z.number().int().positive(),
    })
    .strict(),
});

export type TaskDocumentKind = z.infer<typeof taskDocumentKindSchema>;
export type SaveTaskDocumentBody = z.infer<
  typeof saveTaskDocumentRequestSchema
>['body'];

import { z } from 'zod';
import AppError from '@/utils/appError';

const thumbnailRequestSchema = z.object({
  params: z
    .object({
      artifactId: z.string().uuid(),
      pageNumber: z.coerce.number().int(),
    })
    .strict(),
});

export type ThumbnailRequest = z.infer<typeof thumbnailRequestSchema>;

export const parseThumbnailRequest = (input: unknown): ThumbnailRequest => {
  const parsed = thumbnailRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      'La página solicitada no existe.',
      404,
      'DOCUMENT_PAGE_NOT_FOUND'
    );
  }
  return parsed.data;
};

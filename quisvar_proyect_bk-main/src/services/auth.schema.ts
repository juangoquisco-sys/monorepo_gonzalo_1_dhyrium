import { z } from 'zod';

export const loginRequestSchema = z.object({
  body: z
    .object({
      dni: z
        .string()
        .trim()
        .regex(/^\d{8}$/),
      password: z.string().min(1),
    })
    .strict(),
});

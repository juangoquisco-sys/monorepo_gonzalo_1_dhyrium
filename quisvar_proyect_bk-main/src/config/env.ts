import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';

if (existsSync('.env')) loadEnvFile('.env');

const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional()
);

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().url().optional()
);

const booleanFromEnvironment = z.preprocess(value => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  return value;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(8081),
  HOST: z.string().trim().min(1).default('localhost'),
  ROUTE: z.string().trim().min(1).default('api/v1'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL es obligatoria' })
    .url('DATABASE_URL debe ser una URL válida'),
  SECRET: z
    .string({ required_error: 'SECRET es obligatorio' })
    .trim()
    .min(16, 'SECRET debe tener al menos 16 caracteres'),
  JWT_RESET: z
    .string({ required_error: 'JWT_RESET es obligatorio' })
    .trim()
    .min(16, 'JWT_RESET debe tener al menos 16 caracteres'),
  IV: z
    .string({ required_error: 'IV es obligatorio' })
    .regex(/^[a-fA-F0-9]{32}$/, 'IV debe contener 32 caracteres hexadecimales'),
  SECRET_CODE: z
    .string({ required_error: 'SECRET_CODE es obligatorio' })
    .trim()
    .min(16, 'SECRET_CODE debe tener al menos 16 caracteres'),
  IGNORED_CLIENT_IPS: optionalString,
  MAIL_USER: z.preprocess(
    emptyStringToUndefined,
    z.string().email('MAIL_USER debe ser un correo válido').optional()
  ),
  MAIL_PASSWORD: optionalString,
  MAIL_FROM: z.preprocess(
    emptyStringToUndefined,
    z.string().email('MAIL_FROM debe ser un correo válido').optional()
  ),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  AUDIT_LOG_CLEANUP_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  AUDIT_LOG_CLEANUP_MAX_BATCHES: z.coerce.number().int().positive().default(20),
  ICLOCK_ALLOWED_SERIALS: optionalString,
  ICLOCK_FINGERPRINT_VERIFY_MODES: optionalString,
  ICLOCK_CLOCK_SKEW_SECONDS: z.coerce.number().int().nonnegative().default(30),
  ICLOCK_COMMAND_LEASE_SECONDS: z.coerce.number().int().positive().default(60),
  ZKTECO_DEVICE_IP: optionalString,
  ZKTECO_DEVICE_PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535)
    .default(4370),
  ZKTECO_DEVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5200),
  ZKTECO_DEVICE_INPORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535)
    .default(5000),
  ZKTECO_REALTIME_VERIFY_MODE: optionalString,
  ZKTECO_RECONNECT_DELAY_MS: z.coerce.number().int().positive().default(15000),
  TASK_DOCUMENT_EXTERNAL_BASE_URL: optionalUrl,
  TASK_DOCUMENT_SESSION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(480)
    .default(60),
  TASK_DOCUMENT_SESSION_MAX_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(480),
  TASK_DOCUMENT_LOCK_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),
  TASK_DOCUMENT_ALLOW_INSECURE_HTTP: booleanFromEnvironment.default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  parsed.error.issues.forEach(issue => {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export type Env = z.infer<typeof envSchema>;
export const ENV: Env = Object.freeze(parsed.data);

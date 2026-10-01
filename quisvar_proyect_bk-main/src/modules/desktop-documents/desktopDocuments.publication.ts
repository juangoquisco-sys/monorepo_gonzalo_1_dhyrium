import { mkdir, open, readdir, readFile, rm } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.server';
import DesktopDocumentsStorage, {
  createDesktopDocumentStorageKey,
  DESKTOP_VAULT_ROOT,
} from './desktopDocuments.storage';
import { desktopTransfers } from './desktopDocuments.transfers';

const root = path.join(DESKTOP_VAULT_ROOT, '.publication');
const jobSchema = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid(),
  createdAt: z.number(),
});
type PublicationJob = z.infer<typeof jobSchema>;

export async function queueDesktopPublication(
  documentId: string,
  versionId: string
) {
  const job = jobSchema.parse({ documentId, versionId, createdAt: Date.now() });
  await mkdir(root, { recursive: true });
  const handle = await open(path.join(root, `${job.versionId}.json`), 'wx');
  try {
    await handle.writeFile(JSON.stringify(job));
    await handle.sync();
  } finally {
    await handle.close();
  }
  return job;
}

export async function removeDesktopPublication(job: PublicationJob) {
  await rm(path.join(root, `${jobSchema.parse(job).versionId}.json`), {
    force: true,
  });
}

/** Database is authoritative. A durable journal repairs the static source after crashes.
 * Publication and version commits take the same PostgreSQL lock, so an old save
 * can never replace the source after a newer version was committed. */
export async function publishDesktopSource(job: PublicationJob) {
  const completed = await prisma.$transaction(
    async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${job.documentId}, 0))`;
      const committed = await tx.desktopDocumentVersion.findUnique({
        where: { id: job.versionId },
      });
      if (!committed) return false;
      const document = await tx.desktopDocument.findUnique({
        where: { id: job.documentId },
        include: {
          sourceFile: true,
          sourceBasicFile: true,
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
      const source =
        document?.sourceKind === 'TASK_FILE'
          ? document.sourceFile
          : document?.sourceBasicFile;
      const version = document?.versions[0];
      if (!source?.dir || !version) return false;
      await DesktopDocumentsStorage.replaceSource(
        source.dir,
        source.name,
        version.storageKey
      );
      return true;
    },
    { timeout: 120_000, maxWait: 120_000 }
  );
  if (completed) await removeDesktopPublication(job);
  return completed;
}

let running = false;
export async function repairDesktopPublications() {
  if (running) return;
  running = true;
  try {
    await mkdir(root, { recursive: true });
    for (const name of await readdir(root)) {
      if (!/^[a-f0-9-]{36}\.json$/i.test(name)) continue;
      try {
        const job = jobSchema.parse(
          JSON.parse(await readFile(path.join(root, name), 'utf8'))
        );
        const published = await publishDesktopSource(job);
        if (!published && Date.now() - job.createdAt > 60 * 60 * 1000) {
          const committed = await prisma.desktopDocumentVersion.findUnique({
            where: { id: job.versionId },
          });
          if (!committed) {
            await DesktopDocumentsStorage.remove(
              createDesktopDocumentStorageKey(job.documentId, job.versionId)
            );
            await removeDesktopPublication(job);
          }
        }
      } catch {
        console.warn(
          'Dhyrium Desktop: una publicación pendiente se reintentará.'
        );
      }
    }
    await desktopTransfers.cleanup();
  } finally {
    running = false;
  }
}

export function startDesktopTransferMaintenance() {
  const tick = () => {
    void repairDesktopPublications().catch(() =>
      console.warn('Dhyrium Desktop: mantenimiento pendiente.')
    );
  };
  const timer = setInterval(tick, 60_000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

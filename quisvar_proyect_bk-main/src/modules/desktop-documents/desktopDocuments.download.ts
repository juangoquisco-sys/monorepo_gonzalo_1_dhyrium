import type { Response } from 'express';
import { quoteDesktopDownloadName } from './desktopDocuments.domain';

export function sendDesktopVersion(
  res: Response,
  contentPath: string,
  version: { originalName: string; mimeType: string; checksumSha256: string }
) {
  res.set({
    'Content-Type': version.mimeType,
    'Content-Disposition': `attachment; filename="${quoteDesktopDownloadName(
      version.originalName
    )}"`,
    'Accept-Ranges': 'bytes',
    ETag: `"${version.checksumSha256}"`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  // The path has already been resolved inside the private vault and authorized.
  res.sendFile(contentPath, {
    acceptRanges: true,
    cacheControl: false,
    lastModified: false,
    dotfiles: 'allow',
  });
}

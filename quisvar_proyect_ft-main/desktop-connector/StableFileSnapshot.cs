using System.Security.Cryptography;

namespace Dhyrium.Desktop.Connector;

internal static class StableFileSnapshot
{
    // CAD keeps a writable handle open between saves. Sharing that handle is
    // necessary; verify a second read before publishing any captured bytes.
    public static async Task CreateAsync(string sourcePath, string target, CancellationToken cancellationToken)
    {
        var temporary = target + ".tmp";
        try
        {
            var before = new FileInfo(sourcePath);
            var length = before.Length;
            var modified = before.LastWriteTimeUtc;
            var drive = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(target))!);
            if (drive.AvailableFreeSpace < length + 64L * 1024 * 1024)
                throw new IOException("No hay espacio suficiente para preparar la copia de seguridad.");
            await using (var source = Open(sourcePath))
            await using (var destination = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None, 65536, true))
            {
                await source.CopyToAsync(destination, cancellationToken);
                await destination.FlushAsync(cancellationToken);
                destination.Flush(true);
            }
            await Task.Delay(400, cancellationToken);
            byte[] captured;
            await using (var copy = File.OpenRead(temporary)) captured = await SHA256.HashDataAsync(copy, cancellationToken);
            byte[] current;
            await using (var source = Open(sourcePath)) current = await SHA256.HashDataAsync(source, cancellationToken);
            var after = new FileInfo(sourcePath);
            if (!after.Exists || after.Length != length || after.LastWriteTimeUtc != modified ||
                !CryptographicOperations.FixedTimeEquals(captured, current))
                throw new IOException("El archivo sigue cambiando. Desktop volverá a intentar cuando termine el guardado.");
            File.Move(temporary, target, overwrite: false);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    internal static FileStream Open(string path) => new(path, FileMode.Open, FileAccess.Read,
        FileShare.ReadWrite | FileShare.Delete, 65536, FileOptions.Asynchronous | FileOptions.SequentialScan);
}

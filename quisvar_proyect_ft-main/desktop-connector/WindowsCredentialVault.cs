using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace Dhyrium.Desktop.Connector;

public sealed class WindowsCredentialVault : ITokenVault
{
    private const uint CredentialTypeGeneric = 1;
    private const uint CredentialPersistLocalMachine = 2;
    private const int ErrorNotFound = 1168;

    public void Save(string serverUrl, string token)
    {
        EnsureWindows();
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        var blob = Encoding.UTF8.GetBytes(token);
        var blobPointer = Marshal.AllocHGlobal(blob.Length);
        try
        {
            Marshal.Copy(blob, 0, blobPointer, blob.Length);
            var credential = new NativeCredential
            {
                Type = CredentialTypeGeneric,
                TargetName = TargetName(serverUrl),
                CredentialBlobSize = checked((uint)blob.Length),
                CredentialBlob = blobPointer,
                Persist = CredentialPersistLocalMachine,
                UserName = "DhyriumDesktop",
            };

            if (!CredentialManagerNative.CredWriteW(ref credential, 0))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(),
                    "No fue posible proteger la sesión de Dhyrium en Windows.");
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(blob);
            Marshal.FreeHGlobal(blobPointer);
        }
    }

    public string? Read(string serverUrl)
    {
        EnsureWindows();
        if (!CredentialManagerNative.CredReadW(
                TargetName(serverUrl),
                CredentialTypeGeneric,
                0,
                out var credentialPointer))
        {
            var error = Marshal.GetLastWin32Error();
            if (error == ErrorNotFound)
            {
                return null;
            }

            throw new Win32Exception(error,
                "No fue posible leer la sesión protegida de Dhyrium.");
        }

        try
        {
            var credential = Marshal.PtrToStructure<NativeCredential>(credentialPointer);
            if (credential.CredentialBlob == IntPtr.Zero ||
                credential.CredentialBlobSize == 0)
            {
                return null;
            }

            var blob = new byte[credential.CredentialBlobSize];
            Marshal.Copy(credential.CredentialBlob, blob, 0, blob.Length);
            try
            {
                return Encoding.UTF8.GetString(blob);
            }
            finally
            {
                CryptographicOperations.ZeroMemory(blob);
            }
        }
        finally
        {
            CredentialManagerNative.CredFree(credentialPointer);
        }
    }

    public void Delete(string serverUrl)
    {
        EnsureWindows();
        if (!CredentialManagerNative.CredDeleteW(
                TargetName(serverUrl),
                CredentialTypeGeneric,
                0))
        {
            var error = Marshal.GetLastWin32Error();
            if (error != ErrorNotFound)
            {
                throw new Win32Exception(error,
                    "No fue posible cerrar la sesión protegida de Dhyrium.");
            }
        }
    }

    private static string TargetName(string serverUrl)
    {
        var normalizedServer = ServerEndpoint.NormalizeServerUrl(serverUrl);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedServer));
        return $"Dhyrium.Desktop.{Convert.ToHexString(hash)}";
    }

    private static void EnsureWindows()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException(
                "Dhyrium Desktop requiere Windows para proteger la sesión.");
        }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NativeCredential
    {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    private static class CredentialManagerNative
    {
#pragma warning disable SYSLIB1054
        [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", SetLastError = true,
            CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CredWriteW(ref NativeCredential credential, uint flags);

        [DllImport("Advapi32.dll", EntryPoint = "CredReadW", SetLastError = true,
            CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CredReadW(
            string targetName,
            uint type,
            uint flags,
            out IntPtr credential);

        [DllImport("Advapi32.dll", EntryPoint = "CredDeleteW", SetLastError = true,
            CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CredDeleteW(string targetName, uint type, uint flags);

        [DllImport("Advapi32.dll", EntryPoint = "CredFree")]
        internal static extern void CredFree(IntPtr buffer);
#pragma warning restore SYSLIB1054
    }
}

internal sealed class InMemoryTokenVault : ITokenVault
{
    private readonly Dictionary<string, string> _tokens = new(StringComparer.OrdinalIgnoreCase);

    public void Save(string serverUrl, string token) =>
        _tokens[ServerEndpoint.NormalizeServerUrl(serverUrl)] = token;

    public string? Read(string serverUrl) =>
        _tokens.TryGetValue(ServerEndpoint.NormalizeServerUrl(serverUrl), out var token)
            ? token
            : null;

    public void Delete(string serverUrl) =>
        _tokens.Remove(ServerEndpoint.NormalizeServerUrl(serverUrl));
}

using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using Microsoft.Win32;

namespace Dhyrium.Desktop.Connector;

public enum DrawingPresence { Unknown, Open, Closed }
public interface ICadObserver : IDisposable
{
    string? Source { get; }
    string Status { get; }
    DrawingPresence Presence { get; }
}
internal sealed record CadObservation(DrawingPresence Presence, string? Source, int? Interval, string Status);

internal sealed class AutoCadAutosaveLocator : ICadObserver
{
    [DllImport("ole32.dll", CharSet = CharSet.Unicode)] private static extern int CLSIDFromProgIDEx(string progId, out Guid clsid);
    [DllImport("oleaut32.dll", PreserveSig = false)] private static extern void GetActiveObject(ref Guid clsid, IntPtr reserved, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
    [DllImport("ole32.dll")] private static extern int GetRunningObjectTable(int reserved, out IRunningObjectTable table);
    [DllImport("ole32.dll")] private static extern int CreateBindCtx(int reserved, out IBindCtx context);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    private readonly CancellationTokenSource _stop = new();
    private volatile CadObservation _observation = new(DrawingPresence.Unknown, null, null, "Esperando identificar el autoguardado del dibujo en AutoCAD.");
    private readonly string _drawing;
    private readonly string _logRoot;
    private readonly Func<CadObservation> _probe;
    private int _absent;
    public string? Source => _observation.Source;
    public string Status => _observation.Status;
    public DrawingPresence Presence => _observation.Presence;

    public AutoCadAutosaveLocator(string drawing, Func<CadObservation>? probe = null, bool start = true)
    {
        _drawing = Path.GetFullPath(drawing); _logRoot = Path.GetDirectoryName(drawing)!;
        _probe = probe ?? ProbeIsolated;
        if (!start) return;
        var thread = new Thread(Run) { IsBackground = true, Name = "Dhyrium AutoCAD observer" };
        thread.SetApartmentState(ApartmentState.STA); thread.Start();
    }

    internal bool ObserveOnce()
    {
        try
        {
            var next = _probe();
            if (next.Presence == DrawingPresence.Open) { _absent = 0; }
            else if (next.Presence == DrawingPresence.Closed)
            {
                _absent++;
                if (_absent < 2) next = next with { Presence = DrawingPresence.Unknown };
            }
            else _absent = 0;
            _observation = next with { Source = next.Source ?? _observation.Source };
            return next.Presence != DrawingPresence.Unknown;
        }
        catch (Exception error)
        {
            _absent = 0;
            _observation = _observation with { Presence = DrawingPresence.Unknown,
                Status = $"No se puede consultar AutoCAD (0x{error.HResult:X8}). Reintentando; la última copia identificada se conserva." };
            SessionLog.Write(_logRoot, SessionIdentity.Hash(_drawing), "cad-query-retry", error);
            return false;
        }
    }

    private void Run()
    {
        var failures = 0;
        while (!_stop.IsCancellationRequested)
        {
            failures = ObserveOnce() ? 0 : Math.Min(failures + 1, 5);
            var seconds = failures == 0 ? 5 : Math.Min(15, 1 << (failures - 1));
            if (_stop.Token.WaitHandle.WaitOne(TimeSpan.FromSeconds(seconds))) break;
        }
    }

    private CadObservation ProbeIsolated()
    {
        var executable = Environment.ProcessPath ?? throw new IOException("No se encontró el observador de AutoCAD.");
        var start = new ProcessStartInfo(executable) { UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true };
        if (Path.GetFileNameWithoutExtension(executable).Equals("dotnet", StringComparison.OrdinalIgnoreCase))
            start.ArgumentList.Add(Path.Combine(AppContext.BaseDirectory, "Dhyrium.Desktop.Connector.dll"));
        start.ArgumentList.Add("--cad-observe"); start.ArgumentList.Add(_drawing);
        using var process = Process.Start(start) ?? throw new IOException("No se pudo iniciar el observador de AutoCAD.");
        var output = process.StandardOutput.ReadToEndAsync();
        var errors = process.StandardError.ReadToEndAsync();
        var deadline = DateTime.UtcNow.AddSeconds(12);
        while (!process.WaitForExit(100))
        {
            if (_stop.IsCancellationRequested || DateTime.UtcNow >= deadline)
            {
                process.Kill(); process.WaitForExit();
                throw new TimeoutException("AutoCAD no respondió a tiempo.");
            }
        }
        _ = errors.GetAwaiter().GetResult();
        if (process.ExitCode != 0) throw new IOException("No se pudo consultar AutoCAD.");
        return System.Text.Json.JsonSerializer.Deserialize<CadObservation>(output.GetAwaiter().GetResult())
            ?? throw new IOException("El observador no devolvió un estado válido.");
    }

    internal CadObservation ProbeInProcess()
    {
        var applications = new List<object>();
        var processes = Process.GetProcessesByName("acad");
        var expected = processes.Select(p => p.Id).ToHashSet();
        foreach (var process in processes) process.Dispose();
        var covered = new HashSet<int>();
        CadObservation? found = null;
        var failed = false;
        try
        {
            foreach (var program in Registry.ClassesRoot.GetSubKeyNames().Where(k => k.StartsWith("AutoCAD.Application.", StringComparison.OrdinalIgnoreCase)))
            {
                try { if (CLSIDFromProgIDEx(program, out var clsid) == 0) { GetActiveObject(ref clsid, IntPtr.Zero, out var app); applications.Add(app); } }
                catch (COMException) { }
            }
            // Query registered CAD applications first. Enumerating another application's
            // stale ROT moniker must not prevent observing an already accessible drawing.
            for (var pass = 0; pass < 2; pass++)
            {
            foreach (var app in applications)
            {
                object? documents = null;
                var stage = "HWND";
                try
                {
                    GetWindowThreadProcessId(new IntPtr(Convert.ToInt64(((dynamic)app).HWND)), out var pid);
                    stage = "Documents";
                    documents = ((dynamic)app).Documents;
                    var count = Convert.ToInt32(((dynamic)documents).Count);
                    for (var i = 0; i < count; i++)
                    {
                        object? document = null;
                        try
                        {
                            document = ((dynamic)documents).Item(i);
                            stage = "FullName";
                            string name = ((dynamic)document).FullName;
                            if (string.IsNullOrWhiteSpace(name) || !string.Equals(Path.GetFullPath(name), _drawing, StringComparison.OrdinalIgnoreCase)) continue;
                            found = new(DrawingPresence.Open, null, null, "Dibujo abierto. Esperando consultar el autoguardado.");
                            stage = "SAVETIME";
                            var minutes = Convert.ToInt32(((dynamic)document).GetVariable("SAVETIME"));
                            string file = ((dynamic)document).GetVariable("SAVEFILE");
                            string directory = ((dynamic)document).GetVariable("SAVEFILEPATH");
                            string? source = string.IsNullOrWhiteSpace(file) ? null : Path.GetFullPath(Path.IsPathRooted(file) ? file : Path.Combine(directory, file));
                            if (source is not null && !Path.GetExtension(source).Equals(".sv$", StringComparison.OrdinalIgnoreCase)) source = null;
                            found = new(DrawingPresence.Open, source, minutes, minutes == 0 ? "AutoCAD tiene el autoguardado desactivado (SAVETIME=0)." :
                                $"Intervalo de AutoCAD: {minutes} min. " + (source is null ? "Esperando que AutoCAD genere un autoguardado." : "Autoguardado identificado."));
                        }
                        finally { Release(document); }
                    }
                    covered.Add((int)pid);
                }
                catch (Exception error)
                {
                    failed = true;
                    if (found is not null && found.Interval is null)
                        found = found with { Status = $"Dibujo abierto. No se puede consultar el autoguardado (0x{error.HResult:X8}); reintentando." };
                    SessionLog.Write(_logRoot, SessionIdentity.Hash(_drawing), "cad-instance-retry-" + stage, error);
                }
                finally { Release(documents); }
            }
            if (found is not null || expected.IsSubsetOf(covered)) break;
            if (pass == 0)
            {
                foreach (var app in applications) Release(app);
                applications.Clear();
                AddRunningApplications(applications);
            }
            }
            if (found is not null) return found;
            var complete = !failed && expected.IsSubsetOf(covered);
            return new(complete ? DrawingPresence.Closed : DrawingPresence.Unknown, null, null,
                complete ? "Dibujo cerrado. Copias de recuperación conservadas." :
                "Comprobando estado: no se pueden consultar todas las instancias de AutoCAD/Civil 3D. Si usó Guardar como, vincule explícitamente la nueva copia.");
        }
        finally { foreach (var app in applications) Release(app); }
    }

    private static void AddRunningApplications(List<object> applications)
    {
        IRunningObjectTable? table = null; IBindCtx? context = null; IEnumMoniker? enumerator = null;
        try
        {
            Marshal.ThrowExceptionForHR(GetRunningObjectTable(0, out table));
            Marshal.ThrowExceptionForHR(CreateBindCtx(0, out context));
            table.EnumRunning(out enumerator);
            var names = new IMoniker[1];
            while (enumerator.Next(1, names, IntPtr.Zero) == 0)
            {
                object? value = null;
                try
                {
                    names[0].GetDisplayName(context, null, out var name);
                    if (!name.Contains("autocad", StringComparison.OrdinalIgnoreCase) && !name.EndsWith(".dwg", StringComparison.OrdinalIgnoreCase)) continue;
                    table.GetObject(names[0], out value);
                    if (value is null) continue;
                    object app = ((dynamic)value).Application;
                    applications.Add(app);
                }
                catch (Exception) { /* A stale ROT entry must not abort enumeration. */ }
                finally { Release(value); Release(names[0]); }
            }
        }
        finally { Release(enumerator); Release(context); Release(table); }
    }

    private static void Release(object? value)
    {
        try { if (value is not null && Marshal.IsComObject(value)) Marshal.ReleaseComObject(value); }
        catch (Exception) { /* Never terminate the observer while releasing a stale COM proxy. */ }
    }
    public void Dispose() => _stop.Cancel();
}

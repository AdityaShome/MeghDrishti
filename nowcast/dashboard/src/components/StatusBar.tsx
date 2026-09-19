export function StatusBar({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className="status-bar">
      <span className={`status-dot ${ok ? "ok" : "err"}`} />
      <span>{message}</span>
    </div>
  );
}

export function Banner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="banner">{message}</div>;
}

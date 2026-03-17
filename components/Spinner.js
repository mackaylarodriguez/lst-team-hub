export default function Spinner({ size = 32, className = "" }) {
  return (
    <div
      className={`spinner ${className}`}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    />
  );
}

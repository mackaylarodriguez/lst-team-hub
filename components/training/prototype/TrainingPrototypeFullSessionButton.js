export default function TrainingPrototypeFullSessionButton({
  onClick,
  label = "Open full session",
}) {
  return (
    <button
      type="button"
      className="trainingPrototypeFullSessionBtn"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 5h5v5" />
        <path d="M10 14 19 5" />
        <path d="M19 14v5H5V5h5" />
      </svg>
    </button>
  );
}

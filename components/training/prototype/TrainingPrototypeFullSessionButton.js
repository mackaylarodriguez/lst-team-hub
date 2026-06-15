export default function TrainingPrototypeFullSessionButton({
  onClick,
  label = "Open fullscreen",
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
        <path d="M8 3H3v5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M3 16v5h5" />
      </svg>
    </button>
  );
}

export default function TrainingPrototypeFullSessionButton({
  onClick,
  label = "Open Training Section ↗",
}) {
  return (
    <button type="button" className="btn btnPrimary trainingPrototypeFullSessionBtn" onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="trainingPrototypeFullSessionBtnIcon">
        <path d="M8 3H3v5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M3 16v5h5" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

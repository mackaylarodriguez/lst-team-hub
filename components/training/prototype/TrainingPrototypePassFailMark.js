export default function TrainingPrototypePassFailMark({ complete }) {
  return (
    <span
      className={
        "trainingPrototypePassFailMark" + (complete ? " trainingPrototypePassFailMarkComplete" : "")
      }
      aria-label={complete ? "Complete" : "Not complete"}
      title={complete ? "Complete" : "Not complete"}
    >
      {complete ? "\u2713" : "\u2715"}
    </span>
  );
}

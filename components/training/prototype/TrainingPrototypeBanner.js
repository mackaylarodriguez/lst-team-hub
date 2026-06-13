import { PROTOTYPE_LABEL } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingPrototypeBanner({ compact = false }) {
  return (
    <div
      className="trainingPrototypeBanner"
      style={
        compact
          ? undefined
          : { marginBottom: 16 }
      }
      role="note"
    >
      <span className="trainingPrototypeBannerTag">{PROTOTYPE_LABEL}</span>
      <span className="trainingPrototypeBannerText">
        Demo UI only — mock progress, no database saves, not visible to workers.
      </span>
    </div>
  );
}

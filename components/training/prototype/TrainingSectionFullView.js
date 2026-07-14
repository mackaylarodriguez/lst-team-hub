import TrainingPrototypeFullscreenShell from "./TrainingPrototypeFullscreenShell";
import TrainingPrototypeWrittenBlocks from "./TrainingPrototypeWrittenBlocks";
import { resolvePrototypeSectionVideoEmbed } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingSectionFullView({
  section,
  sectionIndex,
  sectionTotal,
  onBack,
  hasPrevious = false,
  onPrevious,
  onContinue,
  continueLabel = "Next",
  sectionComplete = false,
  onMarkAsRead,
}) {
  const blocks = section?.fullSessionBlocks || [{ heading: section?.title, body: section?.body }];
  const videoEmbedUrl = resolvePrototypeSectionVideoEmbed(section);
  const isVideoSection = Boolean(section?.showVideo);

  return (
    <TrainingPrototypeFullscreenShell
      title={section?.title}
      subtitle={`Section ${sectionIndex + 1} of ${sectionTotal}`}
      onClose={onBack}
      footer={
        <>
          <button type="button" className="btn" onClick={onPrevious} disabled={!hasPrevious}>
            Previous
          </button>
          <div className="spacer" />
          <button type="button" className="btn btnPrimary" onClick={onContinue}>
            {continueLabel}
          </button>
        </>
      }
    >
      <TrainingPrototypeWrittenBlocks blocks={blocks} sectionTitle={section?.title} />

      {isVideoSection ? (
        <div>
          <div className="trainingPrototypeVideoWrap">
            <iframe
              title={section?.title || "Training video"}
              src={videoEmbedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="trainingPrototypeMarkCompleteRow">
            <button
              type="button"
              className={sectionComplete ? "btn" : "btn btnPrimary"}
              disabled={sectionComplete}
              onClick={onMarkAsRead}
            >
              {sectionComplete ? "Marked as watched" : "Mark as watched"}
            </button>
          </div>
        </div>
      ) : (
        <div className="trainingPrototypeMarkCompleteRow">
          <button
            type="button"
            className={sectionComplete ? "btn" : "btn btnPrimary"}
            disabled={sectionComplete}
            onClick={onMarkAsRead}
          >
            {sectionComplete ? "Marked as completed" : "Mark as completed"}
          </button>
        </div>
      )}
    </TrainingPrototypeFullscreenShell>
  );
}

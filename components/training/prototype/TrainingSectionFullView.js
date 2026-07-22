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
  const markLabel = isVideoSection ? "Mark video as watched" : "Mark section as read";
  const markedLabel = isVideoSection ? "Video marked as watched" : "Section marked as read";

  function handleContinue() {
    // Navigation only — never marks complete. Require an explicit mark first.
    if (!sectionComplete) return;
    onContinue?.();
  }

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
          <button
            type="button"
            className="btn btnPrimary"
            onClick={handleContinue}
            disabled={!sectionComplete}
            title={
              sectionComplete
                ? undefined
                : isVideoSection
                  ? "Mark the video as watched before continuing"
                  : "Mark the section as read before continuing"
            }
          >
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
              {sectionComplete ? markedLabel : markLabel}
            </button>
          </div>
          {!sectionComplete ? (
            <p className="small trainingPrototypeMuted" style={{ margin: "8px auto 0", maxWidth: 760 }}>
              Mark the video as watched to unlock{" "}
              {continueLabel === "Continue to quiz" ? "the quiz" : "Next"}.
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <div className="trainingPrototypeMarkCompleteRow">
            <button
              type="button"
              className={sectionComplete ? "btn" : "btn btnPrimary"}
              disabled={sectionComplete}
              onClick={onMarkAsRead}
            >
              {sectionComplete ? markedLabel : markLabel}
            </button>
          </div>
          {!sectionComplete ? (
            <p className="small trainingPrototypeMuted" style={{ margin: "8px auto 0", maxWidth: 760 }}>
              Mark the section as read to unlock{" "}
              {continueLabel === "Continue to quiz" ? "the quiz" : "Next"}.
            </p>
          ) : null}
        </div>
      )}
    </TrainingPrototypeFullscreenShell>
  );
}

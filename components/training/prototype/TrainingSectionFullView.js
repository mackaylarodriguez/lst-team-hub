import { useState } from "react";
import TrainingPrototypeFullscreenShell from "./TrainingPrototypeFullscreenShell";
import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import { TRAINING_CENTER_PROTOTYPE_VIDEO, resolvePrototypeSectionVideoEmbed } from "@/lib/trainingCenterPrototypeMock";

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
  const [videoWatched, setVideoWatched] = useState(false);
  const blocks = section?.fullSessionBlocks || [{ heading: section?.title, body: section?.body }];
  const videoEmbedUrl = resolvePrototypeSectionVideoEmbed(section);
  const videoDescription = section?.videoDescription || TRAINING_CENTER_PROTOTYPE_VIDEO.description;

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
          {section?.showVideo ? (
            <button
              type="button"
              className="btn"
              onClick={() => setVideoWatched(true)}
              style={{ marginRight: 8 }}
            >
              Mark as watched (demo)
            </button>
          ) : null}
          <button type="button" className="btn btnPrimary" onClick={onContinue}>
            {continueLabel}
          </button>
        </>
      }
    >
      <div className="trainingPrototypeWrittenBody">
        {blocks.map((block) => {
          const sectionClassName = block.card
            ? "trainingPrototypeWrittenSection trainingPrototypeTimelineCard"
            : "trainingPrototypeWrittenSection";

          return (
            <div key={block.heading} className={sectionClassName}>
              {block.card ? (
                <p className="trainingPrototypeTimelineCardTitle">{block.heading}</p>
              ) : (
                <h3>{block.heading}</h3>
              )}
              <TrainingPrototypeRichText text={block.body} />
            </div>
          );
        })}
      </div>

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

      {section?.showVideo ? (
        <div>
          <p className="small trainingPrototypeMuted">{videoDescription}</p>
          <div className="trainingPrototypeVideoWrap">
            <iframe
              title={section?.title || "Training video"}
              src={videoEmbedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {videoWatched ? (
            <div className="trainingPrototypeSuccessBox" role="status">
              Mock watch recorded in this browser session only.
            </div>
          ) : null}
        </div>
      ) : null}
    </TrainingPrototypeFullscreenShell>
  );
}

import { useState } from "react";
import TrainingPrototypeFullscreenShell from "./TrainingPrototypeFullscreenShell";
import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import { TRAINING_CENTER_PROTOTYPE_VIDEO } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingSectionFullView({
  section,
  sectionIndex,
  sectionTotal,
  onBack,
  hasPrevious = false,
  onPrevious,
  onContinue,
  continueLabel = "Next",
}) {
  const [videoWatched, setVideoWatched] = useState(false);
  const blocks = section?.fullSessionBlocks || [{ heading: section?.title, body: section?.body }];

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
        {blocks.map((block) => (
          <div key={block.heading} className="trainingPrototypeWrittenSection">
            <h3>{block.heading}</h3>
            <TrainingPrototypeRichText text={block.body} />
          </div>
        ))}
      </div>

      {section?.showVideo ? (
        <div>
          <p className="small trainingPrototypeMuted">{TRAINING_CENTER_PROTOTYPE_VIDEO.description}</p>
          <div className="trainingPrototypeVideoWrap">
            <iframe
              title="Prototype training video sample"
              src={TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl}
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

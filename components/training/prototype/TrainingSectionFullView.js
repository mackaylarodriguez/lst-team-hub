import { useState } from "react";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import TrainingPrototypeDueDate from "./TrainingPrototypeDueDate";
import { TRAINING_CENTER_PROTOTYPE_VIDEO } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingSectionFullView({
  section,
  sectionIndex,
  sectionTotal,
  onBack,
  onContinue,
  continueLabel = "Continue",
}) {
  const [videoWatched, setVideoWatched] = useState(false);
  const blocks = section?.fullSessionBlocks || [{ heading: section?.title, body: section?.body }];

  return (
    <div className="trainingPrototypePage">
      <TrainingPrototypeBanner compact />
      <div className="card pad trainingPrototypePageCard">
        <div className="trainingPrototypePageHeader">
          <div>
            <div className="cardSectionPill trainingPrototypePagePill">
              Full session · Section {sectionIndex + 1} of {sectionTotal}
            </div>
            <h2 className="trainingPrototypePageTitle">{section?.title}</h2>
            <div style={{ marginTop: 6 }}>
              <TrainingPrototypeDueDate
                compact
                dueDate={section?.dueDate}
                rule={section?.dueDateRule}
              />
            </div>
            <p className="small trainingPrototypeMuted" style={{ marginTop: 8 }}>
              Prototype full-screen lesson view. Continue moves to the next section in order.
            </p>
          </div>
        </div>

        <div className="trainingPrototypeWrittenBody">
          {blocks.map((block) => (
            <div key={block.heading} className="trainingPrototypeWrittenSection">
              <h3>{block.heading}</h3>
              <p>{block.body}</p>
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

        <div className="row trainingPrototypePageActions">
          <button type="button" className="btn" onClick={onBack}>
            Back to Training Center
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
        </div>
      </div>
    </div>
  );
}

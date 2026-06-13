import { useState } from "react";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import { TRAINING_CENTER_PROTOTYPE_VIDEO } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingVideoModuleView({ onBack, onMarkComplete }) {
  const content = TRAINING_CENTER_PROTOTYPE_VIDEO;
  const [showCompleteMessage, setShowCompleteMessage] = useState(false);

  function handleMarkComplete() {
    setShowCompleteMessage(true);
    onMarkComplete?.();
  }

  return (
    <div className="trainingPrototypePage">
      <TrainingPrototypeBanner compact />
      <div className="card pad trainingPrototypePageCard">
        <div className="trainingPrototypePageHeader">
          <div>
            <div className="cardSectionPill trainingPrototypePagePill">{content.title}</div>
            <h2 className="trainingPrototypePageTitle">Video lesson (Prototype)</h2>
            <p className="small trainingPrototypeMuted">{content.description}</p>
          </div>
        </div>

        <div className="trainingPrototypeVideoWrap">
          <iframe
            title="Prototype training video sample"
            src={content.embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {showCompleteMessage ? (
          <div className="trainingPrototypeSuccessBox" role="status">
            Mock completion recorded in this browser session only. No data was saved.
          </div>
        ) : null}

        <div className="row trainingPrototypePageActions">
          <button type="button" className="btn" onClick={onBack}>
            Back to Training Center
          </button>
          <div className="spacer" />
          <button type="button" className="btn btnPrimary" onClick={handleMarkComplete}>
            Mark as watched (demo)
          </button>
        </div>
      </div>
    </div>
  );
}

import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import { TRAINING_CENTER_PROTOTYPE_WRITTEN } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingWrittenModuleView({ onBack, onContinue }) {
  const content = TRAINING_CENTER_PROTOTYPE_WRITTEN;

  return (
    <div className="trainingPrototypePage">
      <TrainingPrototypeBanner compact />
      <div className="card pad trainingPrototypePageCard">
        <div className="trainingPrototypePageHeader">
          <div>
            <div className="cardSectionPill trainingPrototypePagePill">{content.title}</div>
            <h2 className="trainingPrototypePageTitle">Written lesson (Prototype)</h2>
          </div>
        </div>

        <div className="trainingPrototypeWrittenBody">
          {content.sections.map((section) => (
            <div key={section.heading} className="trainingPrototypeWrittenSection">
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </div>
          ))}
        </div>

        <div className="row trainingPrototypePageActions">
          <button type="button" className="btn" onClick={onBack}>
            Back to Training Center
          </button>
          <div className="spacer" />
          <button type="button" className="btn btnPrimary" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

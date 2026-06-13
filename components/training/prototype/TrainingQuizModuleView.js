import { useState } from "react";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import TrainingPrototypeDueDate from "./TrainingPrototypeDueDate";
import {
  TRAINING_CENTER_PROTOTYPE_QUIZ,
  TRAINING_GRADEBOOK_PROTOTYPE_QUIZ,
} from "@/lib/trainingCenterPrototypeMock";

export default function TrainingQuizModuleView({ onBack, onSubmitSuccess }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    onSubmitSuccess?.();
  }

  return (
    <div className="trainingPrototypePage">
      <TrainingPrototypeBanner compact />
      <div className="card pad trainingPrototypePageCard">
        <div className="trainingPrototypePageHeader">
          <div>
            <div className="cardSectionPill trainingPrototypePagePill">Module quiz</div>
            <h2 className="trainingPrototypePageTitle">Knowledge check (Prototype)</h2>
            <div style={{ marginTop: 6 }}>
              <TrainingPrototypeDueDate
                dueDate={TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.dueDate}
                rule={TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.dueDateRule}
              />
            </div>
            <p className="small trainingPrototypeMuted" style={{ marginTop: 8 }}>
              Three sample questions. Submit shows a success message — no grading or persistence.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="trainingPrototypeSuccessBox" role="status">
            Success! Your answers were submitted in this demo. In production, results would appear here.
          </div>
        ) : null}

        <form className="trainingPrototypeQuizForm" onSubmit={handleSubmit}>
          {TRAINING_CENTER_PROTOTYPE_QUIZ.map((question, index) => (
            <fieldset key={question.id} className="trainingPrototypeQuizQuestion">
              <legend>
                {index + 1}. {question.prompt}
              </legend>
              <div className="trainingPrototypeQuizOptions">
                {question.options.map((option, optionIndex) => (
                  <label key={option} className="trainingPrototypeQuizOption">
                    <input
                      type="radio"
                      name={question.id}
                      value={String(optionIndex)}
                      checked={answers[question.id] === String(optionIndex)}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: String(optionIndex) }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="row trainingPrototypePageActions">
            <button type="button" className="btn" onClick={onBack}>
              Back to Training Center
            </button>
            <div className="spacer" />
            <button type="submit" className="btn btnPrimary" disabled={submitted}>
              Submit (demo)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

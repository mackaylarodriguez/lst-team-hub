import { useState } from "react";
import TrainingPrototypeFullscreenShell from "./TrainingPrototypeFullscreenShell";
import { TRAINING_CENTER_PROTOTYPE_QUIZ } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingQuizModuleView({ onBack, onSubmitSuccess }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    onSubmitSuccess?.();
  }

  return (
    <TrainingPrototypeFullscreenShell
      title="Knowledge check (Prototype)"
      subtitle="Module quiz"
      onClose={onBack}
      footer={
        <>
          <button type="button" className="btn" onClick={onBack}>
            Back to Training Center
          </button>
          <div className="spacer" />
          <button type="submit" className="btn btnPrimary" form="trainingPrototypeQuizForm" disabled={submitted}>
            Submit (demo)
          </button>
        </>
      }
    >
      <p className="small trainingPrototypeMuted" style={{ marginTop: 0 }}>
        Three sample questions. Submit shows a success message — no grading or persistence.
      </p>

      {submitted ? (
        <div className="trainingPrototypeSuccessBox" role="status">
          Success! Your answers were submitted in this demo. In production, results would appear here.
        </div>
      ) : null}

      <form id="trainingPrototypeQuizForm" className="trainingPrototypeQuizForm" onSubmit={handleSubmit}>
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
      </form>
    </TrainingPrototypeFullscreenShell>
  );
}

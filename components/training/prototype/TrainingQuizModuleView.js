import { useState } from "react";
import TrainingPrototypeFullscreenShell from "./TrainingPrototypeFullscreenShell";
import TrainingPrototypeQuizForm from "./TrainingPrototypeQuizForm";
import { TRAINING_CENTER_PROTOTYPE_QUIZ } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingQuizModuleView({
  title = "Module Quiz",
  subtitle = "Module quiz",
  quizQuestions = TRAINING_CENTER_PROTOTYPE_QUIZ,
  onBack,
  hasPrevious = false,
  onPrevious,
  onSubmitSuccess,
}) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    onSubmitSuccess?.();
  }

  return (
    <TrainingPrototypeFullscreenShell
      title={title}
      subtitle={subtitle}
      onClose={onBack}
      footer={
        <>
          <button type="button" className="btn" onClick={onPrevious} disabled={!hasPrevious}>
            Previous
          </button>
          <div className="spacer" />
          <button type="submit" className="btn btnPrimary" form="trainingPrototypeQuizForm" disabled={submitted}>
            Submit
          </button>
        </>
      }
    >
      <div className="trainingPrototypeQuizShell">
        {submitted ? (
          <div className="trainingPrototypeSuccessBox" role="status">
            Success! Your answers were submitted.
          </div>
        ) : null}

        <TrainingPrototypeQuizForm
          quizQuestions={quizQuestions}
          answers={answers}
          centered
          submitted={submitted}
          onAnswerChange={(questionId, value) =>
            setAnswers((current) => ({ ...current, [questionId]: value }))
          }
          onSubmit={handleSubmit}
        />
      </div>
    </TrainingPrototypeFullscreenShell>
  );
}

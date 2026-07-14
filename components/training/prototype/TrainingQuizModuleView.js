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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const answeredCount = quizQuestions.filter((question) => {
    const value = answers[question.id];
    return value !== undefined && value !== null && value !== "";
  }).length;
  const allAnswered = quizQuestions.length > 0 && answeredCount === quizQuestions.length;

  function handleSubmit(event) {
    event.preventDefault();
    if (!allAnswered) {
      setAttemptedSubmit(true);
      return;
    }
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
          <button
            type="submit"
            className="btn btnPrimary"
            form="trainingPrototypeQuizForm"
            disabled={submitted || !allAnswered}
          >
            {submitted ? "Submitted" : "Submit"}
          </button>
        </>
      }
    >
      <div className="trainingPrototypeQuizShell">
        <div className="trainingPrototypeQuizIntroCard">
          <p className="trainingPrototypeTimelineCardTitle">Before you submit</p>
          <p>
            Answer every question below. This confirms you finished this module&apos;s content with
            your team.
          </p>
        </div>

        {submitted ? (
          <div className="trainingPrototypeSuccessBox" role="status">
            Success! Your answers were submitted.
          </div>
        ) : null}

        {!submitted && attemptedSubmit && !allAnswered ? (
          <div className="trainingPrototypeQuizRequiredNote" role="status">
            Please answer all questions before submitting.
          </div>
        ) : null}

        {!submitted && !allAnswered ? (
          <p className="trainingPrototypeQuizProgressNote">
            {answeredCount} of {quizQuestions.length} answered
          </p>
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

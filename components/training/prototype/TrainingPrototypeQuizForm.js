export default function TrainingPrototypeQuizForm({
  quizQuestions = [],
  answers = {},
  onAnswerChange,
  submitted = false,
  centered = false,
  formId = "trainingPrototypeQuizForm",
  onSubmit,
}) {
  const formClassName = centered
    ? "trainingPrototypeQuizForm trainingPrototypeQuizFormCards"
    : "trainingPrototypeQuizForm";

  return (
    <form
      id={formId}
      className={formClassName}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    >
      {quizQuestions.map((question, index) => {
        const promptId = `${formId}-${question.id}-prompt`;
        const options = question.options.map((option, optionIndex) => (
          <label
            key={option}
            className={centered ? "trainingPrototypeQuizOption trainingPrototypeQuizOptionCentered" : "trainingPrototypeQuizOption"}
          >
            <input
              type="radio"
              name={question.id}
              value={String(optionIndex)}
              checked={answers[question.id] === String(optionIndex)}
              disabled={submitted}
              onChange={() => onAnswerChange?.(question.id, String(optionIndex))}
            />
            <span>{option}</span>
          </label>
        ));

        if (centered) {
          return (
            <div
              key={question.id}
              className="trainingPrototypeQuizQuestionCard"
              role="group"
              aria-labelledby={promptId}
            >
              <p id={promptId} className="trainingPrototypeQuizQuestionPrompt">
                {question.prompt}
              </p>
              <div className="trainingPrototypeQuizOptions trainingPrototypeQuizOptionsCentered">{options}</div>
            </div>
          );
        }

        return (
          <fieldset key={question.id} className="trainingPrototypeQuizQuestion">
            <legend className="trainingPrototypeQuizQuestionPrompt">
              {`${index + 1}. ${question.prompt}`}
            </legend>
            <div className="trainingPrototypeQuizOptions">{options}</div>
          </fieldset>
        );
      })}
    </form>
  );
}

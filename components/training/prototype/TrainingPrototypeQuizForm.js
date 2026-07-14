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
        const answered = answers[question.id] !== undefined && answers[question.id] !== "";
        const options = question.options.map((option, optionIndex) => {
          const selected = answers[question.id] === String(optionIndex);
          const optionClassName = [
            "trainingPrototypeQuizOption",
            centered ? "trainingPrototypeQuizOptionCentered" : "",
            selected ? "trainingPrototypeQuizOptionSelected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <label key={option} className={optionClassName}>
              <input
                type="radio"
                name={question.id}
                value={String(optionIndex)}
                checked={selected}
                disabled={submitted}
                required={centered}
                onChange={() => onAnswerChange?.(question.id, String(optionIndex))}
              />
              <span>{option}</span>
            </label>
          );
        });

        if (centered) {
          return (
            <div
              key={question.id}
              className={
                "trainingPrototypeQuizQuestionCard" +
                (answered ? " trainingPrototypeQuizQuestionCardAnswered" : "")
              }
              role="group"
              aria-labelledby={promptId}
            >
              <div className="trainingPrototypeQuizQuestionHeader">
                <span className="trainingPrototypeQuizQuestionNumber" aria-hidden="true">
                  {index + 1}
                </span>
                <p id={promptId} className="trainingPrototypeQuizQuestionPrompt">
                  {question.prompt}
                </p>
              </div>
              <div className="trainingPrototypeQuizOptions trainingPrototypeQuizOptionsCentered">
                {options}
              </div>
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

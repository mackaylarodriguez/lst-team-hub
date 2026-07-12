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
    ? "trainingPrototypeQuizForm trainingPrototypeQuizFormCentered"
    : "trainingPrototypeQuizForm";
  const questionClassName = centered
    ? "trainingPrototypeQuizQuestion trainingPrototypeQuizQuestionCentered"
    : "trainingPrototypeQuizQuestion";
  const optionsClassName = centered
    ? "trainingPrototypeQuizOptions trainingPrototypeQuizOptionsCentered"
    : "trainingPrototypeQuizOptions";
  const optionClassName = centered
    ? "trainingPrototypeQuizOption trainingPrototypeQuizOptionCentered"
    : "trainingPrototypeQuizOption";

  return (
    <form
      id={formId}
      className={formClassName}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    >
      {quizQuestions.map((question, index) => (
        <fieldset key={question.id} className={questionClassName}>
          <legend>{centered ? question.prompt : `${index + 1}. ${question.prompt}`}</legend>
          <div className={optionsClassName}>
            {question.options.map((option, optionIndex) => (
              <label key={option} className={optionClassName}>
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
            ))}
          </div>
        </fieldset>
      ))}
    </form>
  );
}

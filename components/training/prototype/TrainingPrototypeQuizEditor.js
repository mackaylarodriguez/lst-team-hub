const DEFAULT_QUIZ_OPTIONS = ["Yes", "No"];

export function createQuizQuestionDraft(id, prompt = "") {
  return {
    id,
    prompt,
    options: [...DEFAULT_QUIZ_OPTIONS],
  };
}

export default function TrainingPrototypeQuizEditor({
  questions = [],
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}) {
  return (
    <div className="trainingPrototypeQuizEditor">
      <div className="trainingPrototypeEditLabel">Quiz questions</div>
      <div className="trainingPrototypeQuizEditorList">
        {questions.map((question, index) => (
          <div key={question.id} className="trainingPrototypeQuizEditorCard">
            <div className="trainingPrototypeQuizEditorCardHeader">
              <span className="trainingPrototypeEditLabel">Question {index + 1}</span>
              {questions.length > 1 ? (
                <button
                  type="button"
                  className="btn trainingPrototypeQuizEditorRemoveBtn"
                  onClick={() => onRemoveQuestion?.(question.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <textarea
              className="input trainingPrototypeEditTextarea"
              value={question.prompt}
              onChange={(event) => onUpdateQuestion?.(question.id, { prompt: event.target.value })}
              rows={3}
              placeholder="Enter the question workers will answer"
              required
            />
            <div className="small trainingPrototypeMuted">
              Answers: {DEFAULT_QUIZ_OPTIONS.join(" / ")}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={onAddQuestion}>
        Add question
      </button>
      <span className="small trainingPrototypeMuted">
        Quiz questions appear centered with Yes / No choices for workers.
      </span>
    </div>
  );
}

import { useEffect, useState } from "react";
import { hideBusy, isBusyActive, showBusyDone } from "@/components/BusyOverlay";
import TrainingPrototypeRichTextEditor from "./TrainingPrototypeRichTextEditor";
import TrainingPrototypeQuizEditor, {
  createQuizQuestionDraft,
} from "./TrainingPrototypeQuizEditor";
import { formatPrototypeDueDate } from "@/lib/trainingCenterPrototypeMock";
import {
  embedUrlToYoutubeUrl,
  youtubeUrlToEmbedUrl,
} from "@/lib/trainingPrototypeRichTextEditor";

function createDraftSectionId(prefix = "section") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildBlocksDraft(section) {
  const sourceBlocks = section.fullSessionBlocks || [];
  if (sourceBlocks.length) {
    return sourceBlocks.map((block, index) => ({
      key: `${section.id}-block-${index}`,
      heading: block.heading || "",
      body: block.body || "",
      card: !!block.card,
    }));
  }

  return [
    {
      key: `${section.id}-body`,
      heading: "",
      body: section.body || "",
      card: false,
    },
  ];
}

function buildSectionDraft(section) {
  return {
    id: section.id,
    title: section.title || "",
    dueDate: section.dueDate || "",
    dueDateOverride: section.dueDateOverride || "",
    showVideo: !!section.showVideo,
    videoUrl: section.showVideo ? embedUrlToYoutubeUrl(section.videoEmbedUrl) : "",
    isQuiz: !!section.isQuiz,
    quizQuestions: (section.quizQuestions || []).map((question) => ({
      id: question.id,
      prompt: question.prompt || "",
      options: question.options?.length ? [...question.options] : ["Yes", "No"],
    })),
    blocks: section.isQuiz ? [] : buildBlocksDraft(section),
    isNew: false,
  };
}

function buildDraft(module) {
  return {
    title: module?.title || "",
    sections: (module?.sections || []).map((section) => buildSectionDraft(section)),
  };
}

function createNewSectionDraft() {
  const id = createDraftSectionId("section");
  return {
    id,
    title: "New section",
    dueDate: "",
    dueDateOverride: "",
    showVideo: false,
    videoUrl: "",
    isQuiz: false,
    quizQuestions: [],
    blocks: [{ key: `${id}-block-0`, heading: "", body: "", card: false }],
    isNew: true,
  };
}

function createNewQuizDraft() {
  const id = createDraftSectionId("quiz");
  return {
    id,
    title: "Module Quiz",
    dueDate: "",
    dueDateOverride: "",
    showVideo: false,
    videoUrl: "",
    isQuiz: true,
    quizQuestions: [createQuizQuestionDraft(`${id}-q1`)],
    blocks: [],
    isNew: true,
  };
}

function resolveDueDateOverride(existingSection, sectionDraft) {
  const previousDate = existingSection?.dueDate || "";
  if (sectionDraft.dueDate === previousDate) {
    return existingSection?.dueDateOverride || null;
  }
  return sectionDraft.dueDate || null;
}

function applyBlocks(existingSection, sectionDraft) {
  const sourceBlocks = existingSection?.fullSessionBlocks || [];
  return sectionDraft.blocks.map((block, index) => {
    const original = sourceBlocks[index] || {};
    const heading = String(block.heading || "").trim();
    const next = {
      ...original,
      heading: heading || sectionDraft.title,
      body: block.body || "",
    };
    if (block.card) next.card = true;
    if (heading && heading !== String(sectionDraft.title || "").trim()) {
      delete next.hideHeading;
    }
    return next;
  });
}

function applySectionDraft(existingSection, sectionDraft) {
  const dueDateOverride = resolveDueDateOverride(existingSection, sectionDraft);

  if (sectionDraft.isQuiz) {
    return {
      ...(existingSection || {}),
      id: sectionDraft.id,
      title: sectionDraft.title,
      dueDate: sectionDraft.dueDate,
      dueDateOverride,
      isQuiz: true,
      quizQuestions: sectionDraft.quizQuestions
        .map((question, index) => ({
          id: question.id || `${sectionDraft.id}-q${index + 1}`,
          prompt: String(question.prompt || "").trim(),
          options: question.options?.length ? question.options : ["Yes", "No"],
        }))
        .filter((question) => question.prompt),
    };
  }

  const videoEmbedUrl = sectionDraft.showVideo
    ? youtubeUrlToEmbedUrl(sectionDraft.videoUrl)
    : existingSection?.videoEmbedUrl;
  const fullSessionBlocks = applyBlocks(existingSection, sectionDraft);
  const body = fullSessionBlocks
    .map((block) => String(block.body || "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    ...(existingSection || {}),
    id: sectionDraft.id,
    title: sectionDraft.title,
    dueDate: sectionDraft.dueDate,
    dueDateOverride,
    body,
    showVideo: sectionDraft.showVideo,
    videoEmbedUrl: sectionDraft.showVideo ? videoEmbedUrl : existingSection?.videoEmbedUrl,
    fullSessionBlocks,
  };
}

function applyDraft(module, draft) {
  const existingById = new Map((module.sections || []).map((section) => [section.id, section]));

  return {
    ...module,
    title: draft.title,
    sections: draft.sections.map((sectionDraft) =>
      applySectionDraft(existingById.get(sectionDraft.id), sectionDraft)
    ),
  };
}

export default function TrainingPrototypeModuleEditModal({ module, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => buildDraft(module));
  const [activeSectionId, setActiveSectionId] = useState(() => module?.sections?.[0]?.id || "");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const nextDraft = buildDraft(module);
    setDraft(nextDraft);
    setActiveSectionId(nextDraft.sections[0]?.id || "");
    setSaveError("");
  }, [module?.id]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  if (!module) return null;

  const activeSection =
    draft.sections.find((section) => section.id === activeSectionId) || draft.sections[0] || null;

  function updateSection(sectionId, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  }

  function updateBlock(sectionId, blockKey, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          blocks: section.blocks.map((block) =>
            block.key === blockKey ? { ...block, ...patch } : block
          ),
        };
      }),
    }));
  }

  function updateQuizQuestion(sectionId, questionId, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          quizQuestions: section.quizQuestions.map((question) =>
            question.id === questionId ? { ...question, ...patch } : question
          ),
        };
      }),
    }));
  }

  function addQuizQuestion(sectionId) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const nextIndex = section.quizQuestions.length + 1;
        return {
          ...section,
          quizQuestions: [
            ...section.quizQuestions,
            createQuizQuestionDraft(`${section.id}-q${nextIndex}`),
          ],
        };
      }),
    }));
  }

  function removeQuizQuestion(sectionId, questionId) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          quizQuestions: section.quizQuestions.filter((question) => question.id !== questionId),
        };
      }),
    }));
  }

  function addSection() {
    const section = createNewSectionDraft();
    setDraft((current) => ({ ...current, sections: [...current.sections, section] }));
    setActiveSectionId(section.id);
  }

  function addQuiz() {
    const section = createNewQuizDraft();
    setDraft((current) => ({ ...current, sections: [...current.sections, section] }));
    setActiveSectionId(section.id);
  }

  function removeSection(sectionId) {
    const remaining = draft.sections.filter((section) => section.id !== sectionId);
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
    if (activeSectionId === sectionId) {
      setActiveSectionId(remaining[0]?.id || "");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const missingTitle = draft.sections.find((section) => !String(section.title || "").trim());
    if (missingTitle) {
      setActiveSectionId(missingTitle.id);
      setSaveError("Every section needs a title.");
      return;
    }
    if (!String(draft.title || "").trim()) {
      setSaveError("The module needs a title.");
      return;
    }

    setSaveError("");
    try {
      await onSave?.(applyDraft(module, draft));
      if (isBusyActive()) showBusyDone("Saved");
    } catch (error) {
      hideBusy();
      setSaveError(error?.message || "Unable to save training changes.");
    }
  }

  return (
    <div
      className="appModalOverlay trainingPrototypeEditModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainingPrototypeEditModalTitle"
      onClick={onCancel}
    >
      <form
        className="card trainingPrototypeEditModal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="trainingPrototypeEditModalHeader">
          <div>
            <p className="trainingPrototypeEditEyebrow">Training</p>
            <h2 id="trainingPrototypeEditModalTitle" className="trainingPrototypeEditModalTitle">
              Edit module
            </h2>
          </div>
          <button type="button" className="btn" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="trainingPrototypeEditModuleBar">
          <label className="trainingPrototypeEditField">
            <span className="trainingPrototypeEditLabel">Module title</span>
            <input
              className="input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="trainingPrototypeEditWorkspace">
          <aside className="trainingPrototypeEditNav" aria-label="Sections">
            <div className="trainingPrototypeEditNavList">
              {draft.sections.map((section, index) => {
                const isActive = section.id === activeSection?.id;
                const meta = section.isQuiz
                  ? "Quiz"
                  : section.dueDate
                    ? `Due ${formatPrototypeDueDate(section.dueDate)}`
                    : "Automatic due date";
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`trainingPrototypeEditNavBtn${isActive ? " isActive" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <span className="trainingPrototypeEditNavIndex">{index + 1}</span>
                    <span className="trainingPrototypeEditNavCopy">
                      <span className="trainingPrototypeEditNavTitle">
                        {section.title || (section.isQuiz ? "Quiz" : "Section")}
                      </span>
                      <span className="trainingPrototypeEditNavMeta">{meta}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="trainingPrototypeEditAddRow">
              <button type="button" className="btn" onClick={addSection}>
                Add section
              </button>
              <button type="button" className="btn" onClick={addQuiz}>
                Add quiz
              </button>
            </div>
          </aside>

          <div className="trainingPrototypeEditPane">
            {activeSection ? (
              <>
                <div className="trainingPrototypeEditPaneHeader">
                  <div>
                    <h3 className="trainingPrototypeEditPaneTitle">
                      {activeSection.isQuiz ? "Quiz" : "Section"}
                    </h3>
                    <p className="small trainingPrototypeMuted">
                      {activeSection.isQuiz
                        ? "Questions workers answer before this module is complete."
                        : "This is the text workers see in the section."}
                    </p>
                  </div>
                  {draft.sections.length > 1 ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => removeSection(activeSection.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <label className="trainingPrototypeEditField">
                  <span className="trainingPrototypeEditLabel">
                    {activeSection.isQuiz ? "Quiz title" : "Section title"}
                  </span>
                  <input
                    className="input"
                    value={activeSection.title}
                    onChange={(event) =>
                      updateSection(activeSection.id, { title: event.target.value })
                    }
                    required
                  />
                </label>

                <div className="trainingPrototypeEditMetaRow">
                  <label className="trainingPrototypeEditField">
                    <span className="trainingPrototypeEditLabel">Due date</span>
                    <input
                      className="input"
                      type="date"
                      value={activeSection.dueDate}
                      onChange={(event) =>
                        updateSection(activeSection.id, { dueDate: event.target.value })
                      }
                    />
                    <span className="small trainingPrototypeMuted">
                      Clear the date to use the automatic training deadline.
                    </span>
                  </label>

                  {!activeSection.isQuiz ? (
                    <div className="trainingPrototypeEditField">
                      <label className="trainingPrototypeEditCheckboxRow">
                        <input
                          type="checkbox"
                          checked={activeSection.showVideo}
                          onChange={(event) =>
                            updateSection(activeSection.id, { showVideo: event.target.checked })
                          }
                        />
                        <span className="trainingPrototypeEditLabel">Include embedded video</span>
                      </label>
                      {activeSection.showVideo ? (
                        <input
                          className="input"
                          value={activeSection.videoUrl}
                          onChange={(event) =>
                            updateSection(activeSection.id, { videoUrl: event.target.value })
                          }
                          placeholder="https://youtu.be/..."
                        />
                      ) : (
                        <span className="small trainingPrototypeMuted">
                          Optional YouTube video under the written section.
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {activeSection.isQuiz ? (
                  <TrainingPrototypeQuizEditor
                    questions={activeSection.quizQuestions}
                    onAddQuestion={() => addQuizQuestion(activeSection.id)}
                    onRemoveQuestion={(questionId) =>
                      removeQuizQuestion(activeSection.id, questionId)
                    }
                    onUpdateQuestion={(questionId, patch) =>
                      updateQuizQuestion(activeSection.id, questionId, patch)
                    }
                  />
                ) : (
                  <div className="trainingPrototypeEditCardList">
                    {activeSection.blocks.map((block, blockIndex) => (
                      <div key={block.key} className="trainingPrototypeEditCard">
                        <div className="trainingPrototypeEditSectionHeading">
                          {activeSection.blocks.length > 1 ? `Part ${blockIndex + 1}` : "Content"}
                        </div>
                        {block.card || activeSection.blocks.length > 1 ? (
                          <label className="trainingPrototypeEditField">
                            <span className="trainingPrototypeEditLabel">Heading</span>
                            <input
                              className="input"
                              value={block.heading}
                              onChange={(event) =>
                                updateBlock(activeSection.id, block.key, {
                                  heading: event.target.value,
                                })
                              }
                            />
                          </label>
                        ) : null}
                        <div className="trainingPrototypeEditField">
                          <span className="trainingPrototypeEditLabel">
                            {block.card ? "Card text" : "Section text"}
                          </span>
                          <TrainingPrototypeRichTextEditor
                            value={block.body}
                            onChange={(nextValue) =>
                              updateBlock(activeSection.id, block.key, { body: nextValue })
                            }
                            rows={8}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="small trainingPrototypeMuted">Add a section to start editing.</p>
            )}
          </div>
        </div>

        <div className="trainingPrototypeEditModalFooter">
          {saveError ? (
            <div className="small trainingPrototypeEditSaveError" role="alert">
              {saveError}
            </div>
          ) : (
            <p className="small trainingPrototypeMuted trainingPrototypeEditSaveHint">
              Saved changes show for every staff member and worker.
            </p>
          )}
          <div className="trainingPrototypeEditFooterActions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btnPrimary">
              Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

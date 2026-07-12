import { useEffect, useState } from "react";
import TrainingPrototypeRichTextEditor from "./TrainingPrototypeRichTextEditor";
import TrainingPrototypeQuizEditor, {
  createQuizQuestionDraft,
} from "./TrainingPrototypeQuizEditor";
import {
  embedUrlToYoutubeUrl,
  youtubeUrlToEmbedUrl,
} from "@/lib/trainingPrototypeRichTextEditor";

function createDraftSectionId(prefix = "section") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getEditableTextBlock(section) {
  return (section?.fullSessionBlocks || []).find((block) => !block.card) || null;
}

function buildLinkButtonDraft(block) {
  return {
    enabled: !!block?.linkButton,
    label: block?.linkButton?.label || "",
    href: block?.linkButton?.href || "",
  };
}

function buildLinkButton(linkButtonDraft) {
  if (!linkButtonDraft?.enabled) return undefined;
  const href = String(linkButtonDraft.href || "").trim();
  if (!href) return undefined;

  return {
    label: String(linkButtonDraft.label || "").trim() || "Open link",
    href,
  };
}

function buildSectionDraft(section) {
  const editableTextBlock = getEditableTextBlock(section);

  return {
    id: section.id,
    title: section.title || "",
    dueDate: section.dueDate || "",
    body: section.body || "",
    showVideo: !!section.showVideo,
    videoUrl: section.showVideo ? embedUrlToYoutubeUrl(section.videoEmbedUrl) : "",
    isQuiz: !!section.isQuiz,
    quizQuestions: (section.quizQuestions || []).map((question) => ({
      id: question.id,
      prompt: question.prompt || "",
      options: question.options?.length ? [...question.options] : ["Yes", "No"],
    })),
    linkButton: buildLinkButtonDraft(editableTextBlock),
    cards: (section.fullSessionBlocks || [])
      .filter((block) => block.card)
      .map((block) => ({
        heading: block.heading || "",
        body: block.body || "",
      })),
    blockHeading:
      section.fullSessionBlocks?.length === 1 && !section.fullSessionBlocks[0]?.card
        ? section.fullSessionBlocks[0].heading || ""
        : section.title || "",
    hideHeading: !!section.fullSessionBlocks?.some((block) => block.hideHeading),
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
    body: "",
    showVideo: false,
    videoUrl: "",
    isQuiz: false,
    quizQuestions: [],
    linkButton: { enabled: false, label: "", href: "" },
    cards: [],
    blockHeading: "New section",
    hideHeading: false,
    isNew: true,
  };
}

function createNewQuizDraft() {
  const id = createDraftSectionId("quiz");
  return {
    id,
    title: "Module Quiz",
    dueDate: "",
    body: "",
    showVideo: false,
    videoUrl: "",
    isQuiz: true,
    quizQuestions: [createQuizQuestionDraft(`${id}-q1`)],
    linkButton: { enabled: false, label: "", href: "" },
    cards: [],
    blockHeading: "",
    hideHeading: false,
    isNew: true,
  };
}

function applySectionDraft(existingSection, sectionDraft) {
  if (sectionDraft.isQuiz) {
    return {
      ...(existingSection || {}),
      id: sectionDraft.id,
      title: sectionDraft.title,
      dueDate: sectionDraft.dueDate,
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
  const linkButton = buildLinkButton(sectionDraft.linkButton);

  if (sectionDraft.isNew || !existingSection) {
    return {
      id: sectionDraft.id,
      title: sectionDraft.title,
      dueDate: sectionDraft.dueDate,
      body: sectionDraft.body,
      showVideo: sectionDraft.showVideo,
      videoEmbedUrl: sectionDraft.showVideo ? videoEmbedUrl : undefined,
      fullSessionBlocks: [
        {
          heading: sectionDraft.blockHeading || sectionDraft.title,
          body: sectionDraft.body,
          hideHeading: sectionDraft.hideHeading,
          linkButton,
        },
      ],
    };
  }

  let fullSessionBlocks = existingSection.fullSessionBlocks;
  if (sectionDraft.cards.length > 0) {
    fullSessionBlocks = sectionDraft.cards.map((card) => ({
      heading: card.heading,
      body: card.body,
      card: true,
    }));
  } else if (existingSection.fullSessionBlocks?.length === 1 && !existingSection.fullSessionBlocks[0]?.card) {
    fullSessionBlocks = [
      {
        ...existingSection.fullSessionBlocks[0],
        heading: sectionDraft.blockHeading || existingSection.fullSessionBlocks[0].heading,
        body: sectionDraft.body,
        hideHeading: sectionDraft.hideHeading,
        linkButton,
      },
    ];
  } else if (
    existingSection.fullSessionBlocks?.length > 1 &&
    !existingSection.fullSessionBlocks.some((block) => block.card)
  ) {
    fullSessionBlocks = existingSection.fullSessionBlocks.map((block, index) =>
      index === 0 ? { ...block, body: sectionDraft.body, linkButton } : block
    );
  }

  return {
    ...existingSection,
    title: sectionDraft.title,
    dueDate: sectionDraft.dueDate,
    body: sectionDraft.body,
    showVideo: sectionDraft.showVideo,
    videoEmbedUrl: sectionDraft.showVideo ? videoEmbedUrl : existingSection.videoEmbedUrl,
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

  useEffect(() => {
    setDraft(buildDraft(module));
  }, [module]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  if (!module) return null;

  function updateSection(sectionId, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  }

  function updateSectionLinkButton(sectionId, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, linkButton: { ...section.linkButton, ...patch } }
          : section
      ),
    }));
  }

  function updateCard(sectionId, cardIndex, patch) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const cards = section.cards.map((card, index) =>
          index === cardIndex ? { ...card, ...patch } : card
        );
        return { ...section, cards };
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
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, createNewSectionDraft()],
    }));
  }

  function addQuiz() {
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, createNewQuizDraft()],
    }));
  }

  function removeSection(sectionId) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave?.(applyDraft(module, draft));
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
        className="card pad trainingPrototypeEditModal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="trainingPrototypeEditModalHeader">
          <div>
            <h2 id="trainingPrototypeEditModalTitle" className="trainingPrototypeEditModalTitle">
              Edit module
            </h2>
            <p className="small trainingPrototypeMuted" style={{ margin: "6px 0 0" }}>
              Prototype changes save in this browser only.
            </p>
          </div>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <label className="trainingPrototypeEditField">
          <span className="trainingPrototypeEditLabel">Module title</span>
          <input
            className="input"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            required
          />
        </label>

        <div className="trainingPrototypeEditSectionList">
          {draft.sections.map((section, index) => (
            <div key={section.id} className="trainingPrototypeEditSectionCard">
              <div className="trainingPrototypeEditSectionHeadingRow">
                <div className="trainingPrototypeEditSectionHeading">
                  {section.isQuiz ? `Quiz ${index + 1}` : `Section ${index + 1}`}
                </div>
                {draft.sections.length > 1 ? (
                  <button type="button" className="btn" onClick={() => removeSection(section.id)}>
                    Remove
                  </button>
                ) : null}
              </div>

              <label className="trainingPrototypeEditField">
                <span className="trainingPrototypeEditLabel">
                  {section.isQuiz ? "Quiz title" : "Section title"}
                </span>
                <input
                  className="input"
                  value={section.title}
                  onChange={(event) => updateSection(section.id, { title: event.target.value })}
                  required
                />
              </label>

              <label className="trainingPrototypeEditField">
                <span className="trainingPrototypeEditLabel">Due date</span>
                <input
                  className="input"
                  type="date"
                  value={section.dueDate}
                  onChange={(event) => updateSection(section.id, { dueDate: event.target.value })}
                />
              </label>

              {!section.isQuiz ? (
                <div className="trainingPrototypeEditField">
                  <label className="trainingPrototypeEditCheckboxRow">
                    <input
                      type="checkbox"
                      checked={section.showVideo}
                      onChange={(event) =>
                        updateSection(section.id, { showVideo: event.target.checked })
                      }
                    />
                    <span className="trainingPrototypeEditLabel">Include embedded video</span>
                  </label>
                  {section.showVideo ? (
                    <label className="trainingPrototypeEditField" style={{ marginTop: 10 }}>
                      <span className="trainingPrototypeEditLabel">YouTube video URL</span>
                      <input
                        className="input"
                        value={section.videoUrl}
                        onChange={(event) =>
                          updateSection(section.id, { videoUrl: event.target.value })
                        }
                        placeholder="https://youtu.be/..."
                      />
                      <span className="small trainingPrototypeMuted">
                        Paste a YouTube link. The Hub converts it to an embedded player automatically.
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {section.cards.length > 0 ? (
                <div className="trainingPrototypeEditCardList">
                  {section.cards.map((card, cardIndex) => (
                    <div key={`${section.id}-card-${cardIndex}`} className="trainingPrototypeEditCard">
                      <label className="trainingPrototypeEditField">
                        <span className="trainingPrototypeEditLabel">Card title</span>
                        <input
                          className="input"
                          value={card.heading}
                          onChange={(event) =>
                            updateCard(section.id, cardIndex, { heading: event.target.value })
                          }
                          required
                        />
                      </label>
                      <div className="trainingPrototypeEditField">
                        <span className="trainingPrototypeEditLabel">Card content</span>
                        <TrainingPrototypeRichTextEditor
                          value={card.body}
                          onChange={(nextValue) =>
                            updateCard(section.id, cardIndex, { body: nextValue })
                          }
                          rows={8}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : section.isQuiz ? (
                <TrainingPrototypeQuizEditor
                  questions={section.quizQuestions}
                  onAddQuestion={() => addQuizQuestion(section.id)}
                  onRemoveQuestion={(questionId) => removeQuizQuestion(section.id, questionId)}
                  onUpdateQuestion={(questionId, patch) =>
                    updateQuizQuestion(section.id, questionId, patch)
                  }
                />
              ) : (
                <>
                  <label className="trainingPrototypeEditField">
                    <span className="trainingPrototypeEditLabel">Fullscreen heading</span>
                    <input
                      className="input"
                      value={section.blockHeading}
                      onChange={(event) =>
                        updateSection(section.id, { blockHeading: event.target.value })
                      }
                    />
                  </label>
                  <div className="trainingPrototypeEditField">
                    <span className="trainingPrototypeEditLabel">Content</span>
                    <TrainingPrototypeRichTextEditor
                      value={section.body}
                      onChange={(nextValue) => updateSection(section.id, { body: nextValue })}
                      rows={10}
                      required
                    />
                  </div>
                  <div className="trainingPrototypeEditField trainingPrototypeEditButtonPanel">
                    <label className="trainingPrototypeEditCheckboxRow">
                      <input
                        type="checkbox"
                        checked={section.linkButton?.enabled || false}
                        onChange={(event) =>
                          updateSectionLinkButton(section.id, { enabled: event.target.checked })
                        }
                      />
                      <span className="trainingPrototypeEditLabel">Add button below this text</span>
                    </label>
                    {section.linkButton?.enabled ? (
                      <div className="trainingPrototypeEditButtonFields">
                        <label className="trainingPrototypeEditField">
                          <span className="trainingPrototypeEditLabel">Button label</span>
                          <input
                            className="input"
                            value={section.linkButton.label}
                            onChange={(event) =>
                              updateSectionLinkButton(section.id, { label: event.target.value })
                            }
                            placeholder="Open resource"
                          />
                        </label>
                        <label className="trainingPrototypeEditField">
                          <span className="trainingPrototypeEditLabel">Button URL</span>
                          <input
                            className="input"
                            value={section.linkButton.href}
                            onChange={(event) =>
                              updateSectionLinkButton(section.id, { href: event.target.value })
                            }
                            placeholder="https://..."
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="trainingPrototypeEditAddRow">
          <button type="button" className="btn" onClick={addSection}>
            Add section
          </button>
          <button type="button" className="btn" onClick={addQuiz}>
            Add quiz
          </button>
        </div>

        <div className="trainingPrototypeEditModalFooter">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btnPrimary">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

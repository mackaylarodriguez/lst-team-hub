import { useEffect, useState } from "react";

function buildDraft(module) {
  return {
    title: module?.title || "",
    sections: (module?.sections || []).map((section) => ({
      id: section.id,
      title: section.title || "",
      dueDate: section.dueDate || "",
      body: section.body || "",
      cards: (section.fullSessionBlocks || [])
        .filter((block) => block.card)
        .map((block) => ({
          heading: block.heading || "",
          body: block.body || "",
        })),
      blockHeading:
        section.fullSessionBlocks?.length === 1 && !section.fullSessionBlocks[0]?.card
          ? section.fullSessionBlocks[0].heading || ""
          : "",
    })),
  };
}

function applyDraft(module, draft) {
  const sections = (module.sections || []).map((section) => {
    const sectionDraft = draft.sections.find((item) => item.id === section.id);
    if (!sectionDraft) return section;

    let fullSessionBlocks = section.fullSessionBlocks;
    if (sectionDraft.cards.length > 0) {
      fullSessionBlocks = sectionDraft.cards.map((card) => ({
        heading: card.heading,
        body: card.body,
        card: true,
      }));
    } else if (section.fullSessionBlocks?.length === 1 && !section.fullSessionBlocks[0]?.card) {
      fullSessionBlocks = [
        {
          ...section.fullSessionBlocks[0],
          heading: sectionDraft.blockHeading || section.fullSessionBlocks[0].heading,
          body: sectionDraft.body,
        },
      ];
    } else if (section.fullSessionBlocks?.length > 1 && !section.fullSessionBlocks.some((block) => block.card)) {
      fullSessionBlocks = section.fullSessionBlocks.map((block, index) =>
        index === 0 ? { ...block, body: sectionDraft.body } : block
      );
    }

    return {
      ...section,
      title: sectionDraft.title,
      dueDate: sectionDraft.dueDate,
      body: sectionDraft.body,
      fullSessionBlocks,
    };
  });

  return {
    ...module,
    title: draft.title,
    sections,
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
              <div className="trainingPrototypeEditSectionHeading">Section {index + 1}</div>

              <label className="trainingPrototypeEditField">
                <span className="trainingPrototypeEditLabel">Section title</span>
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
                      <label className="trainingPrototypeEditField">
                        <span className="trainingPrototypeEditLabel">Card content</span>
                        <textarea
                          className="input trainingPrototypeEditTextarea"
                          value={card.body}
                          onChange={(event) =>
                            updateCard(section.id, cardIndex, { body: event.target.value })
                          }
                          rows={8}
                          required
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {section.blockHeading ? (
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
                  ) : null}
                  <label className="trainingPrototypeEditField">
                    <span className="trainingPrototypeEditLabel">Content</span>
                    <textarea
                      className="input trainingPrototypeEditTextarea"
                      value={section.body}
                      onChange={(event) => updateSection(section.id, { body: event.target.value })}
                      rows={10}
                      required
                    />
                    <span className="small trainingPrototypeMuted">
                      Use blank lines between paragraphs, **bold**, and lines starting with - for bullets.
                    </span>
                  </label>
                </>
              )}
            </div>
          ))}
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

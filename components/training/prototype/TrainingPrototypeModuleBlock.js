import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import TrainingPrototypeFullSessionButton from "./TrainingPrototypeFullSessionButton";
import {
  TRAINING_CENTER_PROTOTYPE_VIDEO,
  PROTOTYPE_STATUS_META,
  formatPrototypeDueDate,
  getPrototypeModuleStatus,
} from "@/lib/trainingCenterPrototypeMock";

function PrototypeEditButton() {
  return (
    <button
      type="button"
      className="btn trainingPrototypeEditBtn"
      title="Prototype only — editing is not wired yet"
      onClick={() => {
        // UI placeholder for future staff authoring
      }}
    >
      Edit
    </button>
  );
}

export default function TrainingPrototypeModuleBlock({
  module,
  completedSectionIds,
  sectionQuizSubmitted,
  defaultOpen = true,
  onOpenFullSession,
  onOpenQuiz,
  onMarkSectionRead,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sections = module.sections || [];
  const moduleStatus = getPrototypeModuleStatus(completedSectionIds, module);
  const moduleStatusMeta = PROTOTYPE_STATUS_META[moduleStatus] || PROTOTYPE_STATUS_META.not_started;

  return (
    <div className="trainingPrototypeModuleShell">
      <div className="trainingPrototypeModuleHeadingRow">
        <button
          type="button"
          className="trainingPrototypeModuleToggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="trainingPrototypeModuleChevron" aria-hidden="true">
            {open ? "\u25BC" : "\u25B6"}
          </span>
          <div className="trainingPrototypeModuleHeadingContent">
            <h2 className="trainingPrototypeModuleHeading">{module.title}</h2>
          </div>
        </button>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className={`badge ${moduleStatusMeta.badge}`}>{moduleStatusMeta.label}</span>
          <PrototypeEditButton />
        </div>
      </div>

      {open ? (
        <div className="trainingPrototypeSectionStack">
          {sections.map((section, index) => {
            const sectionComplete = !!completedSectionIds[section.id];
            const sectionStatus = sectionComplete
              ? PROTOTYPE_STATUS_META.completed
              : index === 0 || completedSectionIds[sections[index - 1]?.id]
                ? PROTOTYPE_STATUS_META.in_progress
                : PROTOTYPE_STATUS_META.not_started;

            return (
              <CollapsibleSection
                key={section.id}
                variant="slim"
                title={section.title}
                subtitle={
                  section.isQuiz
                    ? `3 questions · Due ${formatPrototypeDueDate(section.dueDate)}`
                    : `Due ${formatPrototypeDueDate(section.dueDate)}`
                }
                defaultOpen={index === 0 && defaultOpen}
                badge={<span className={`badge ${sectionStatus.badge}`}>{sectionStatus.label}</span>}
              >
                <div className="trainingPrototypeSectionInner">
                  {section.fullSessionBlocks?.some((block) => block.card) ? (
                    <div className="trainingPrototypeTimelineCardStack">
                      {section.fullSessionBlocks.map((block) => (
                        <div key={block.heading} className="trainingPrototypeTimelineCard">
                          <p className="trainingPrototypeTimelineCardTitle">{block.heading}</p>
                          <TrainingPrototypeRichText text={block.body} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TrainingPrototypeRichText text={section.body} />
                  )}

                  {section.showVideo ? (
                    <div className="trainingPrototypeVideoWrap trainingPrototypeVideoWrapCompact">
                      <iframe
                        title="Prototype embedded video preview"
                        src={TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {section.isQuiz ? (
                    <div className="trainingPrototypeQuizPreview">
                      {sectionQuizSubmitted ? (
                        <div className="trainingPrototypeSuccessBox" role="status">
                          Quiz submitted in demo mode.
                        </div>
                      ) : (
                        <p className="small trainingPrototypeMuted">
                          Multiple-choice questions appear on the dedicated quiz page.
                        </p>
                      )}
                      <div className="trainingPrototypeSectionActions">
                        <div className="trainingPrototypeSectionFooter">
                          <TrainingPrototypeFullSessionButton
                            label="Open fullscreen quiz"
                            onClick={() => onOpenQuiz(module.id)}
                          />
                        </div>
                        <div className="trainingPrototypeMarkReadRow">
                          <button
                            type="button"
                            className={sectionComplete ? "btn" : "btn btnPrimary"}
                            disabled={sectionComplete}
                            onClick={() => onMarkSectionRead?.(section.id)}
                          >
                            {sectionComplete ? "Marked as read" : "Mark as read"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="trainingPrototypeSectionActions">
                      <div className="trainingPrototypeSectionFooter">
                        <TrainingPrototypeFullSessionButton
                          onClick={() => onOpenFullSession(module.id, section.id)}
                        />
                      </div>
                      <div className="trainingPrototypeMarkReadRow">
                        <button
                          type="button"
                          className={sectionComplete ? "btn" : "btn btnPrimary"}
                          disabled={sectionComplete}
                          onClick={() => onMarkSectionRead?.(section.id)}
                        >
                          {sectionComplete ? "Marked as read" : "Mark as read"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

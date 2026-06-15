import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeDueDate from "./TrainingPrototypeDueDate";
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
            <p className="small trainingPrototypeMuted" style={{ margin: "6px 0 0" }}>
              {module.subtitle}
            </p>
            <div style={{ marginTop: 8 }}>
              <TrainingPrototypeDueDate dueDate={module.dueDate} rule={module.dueDateRule} />
            </div>
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
                  {section.dueDateRule ? (
                    <p className="small trainingPrototypeMuted trainingPrototypeSectionRule">
                      {section.dueDateRule}
                    </p>
                  ) : null}
                  <p>{section.body}</p>

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
                      <div className="trainingPrototypeSectionFooter">
                        <TrainingPrototypeFullSessionButton
                          label="Open full quiz"
                          onClick={() => onOpenQuiz(module.id)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="trainingPrototypeSectionFooter">
                      <TrainingPrototypeFullSessionButton
                        onClick={() => onOpenFullSession(module.id, section.id)}
                      />
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

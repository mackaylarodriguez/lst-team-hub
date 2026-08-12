import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import TrainingPrototypeWrittenBlocks from "./TrainingPrototypeWrittenBlocks";
import TrainingPrototypeFullSessionButton from "./TrainingPrototypeFullSessionButton";
import { buildTrainingModuleRowDomId } from "@/components/trip/tripPageShared";
import {
  PROTOTYPE_STATUS_META,
  formatPrototypeDueDate,
  getPrototypeModuleStatus,
  getPrototypeSectionQuiz,
  resolvePrototypeSectionVideoEmbed,
} from "@/lib/trainingCenterPrototypeMock";
import TrainingPrototypeQuizForm from "./TrainingPrototypeQuizForm";
import TrainingPrototypeSectionAckStatus from "./TrainingPrototypeSectionAckStatus";

export default function TrainingPrototypeModuleBlock({
  module,
  completedSectionIds,
  defaultOpen = true,
  canEdit = false,
  canViewSectionAckRoster = false,
  sectionCompletionRosters = {},
  onEditModule,
  onOpenFullSession,
  onOpenQuiz,
  onMarkSectionRead,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sections = module.sections || [];
  const moduleStatus = getPrototypeModuleStatus(completedSectionIds, module);
  const moduleStatusMeta = PROTOTYPE_STATUS_META[moduleStatus] || PROTOTYPE_STATUS_META.not_started;

  return (
    <div className="trainingPrototypeModuleShell" id={buildTrainingModuleRowDomId(module.id)}>
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
          {canEdit ? (
            <button
              type="button"
              className="btn trainingPrototypeEditBtn"
              onClick={() => onEditModule?.(module.id)}
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="trainingPrototypeSectionStack">
          {sections.map((section, index) => {
            const sectionComplete = !!completedSectionIds[section.id];
            // Only explicit mark/quiz submit counts — opening or clicking Next does not.
            const firstIncompleteIndex = sections.findIndex((item) => !completedSectionIds[item.id]);
            const hasAnyComplete = sections.some((item) => completedSectionIds[item.id]);
            const sectionStatus = sectionComplete
              ? PROTOTYPE_STATUS_META.completed
              : hasAnyComplete && index === firstIncompleteIndex
                ? PROTOTYPE_STATUS_META.in_progress
                : PROTOTYPE_STATUS_META.not_started;

            return (
              <CollapsibleSection
                key={section.id}
                variant="slim"
                title={section.title}
                subtitle={
                  section.isQuiz
                    ? `${(section.quizQuestions || getPrototypeSectionQuiz(section)).length} questions · Due ${formatPrototypeDueDate(section.dueDate)}`
                    : `Due ${formatPrototypeDueDate(section.dueDate)}`
                }
                defaultOpen={index === 0 && defaultOpen}
                badge={<span className={`badge ${sectionStatus.badge}`}>{sectionStatus.label}</span>}
              >
                <div className="trainingPrototypeSectionInner">
                  {section.fullSessionBlocks?.length ? (
                    <TrainingPrototypeWrittenBlocks
                      blocks={section.fullSessionBlocks}
                      sectionTitle={section.title}
                    />
                  ) : (
                    <TrainingPrototypeRichText text={section.body} />
                  )}

                  {section.showVideo ? (
                    <div className="trainingPrototypeVideoWrap trainingPrototypeVideoWrapCompact">
                      <iframe
                        title={section.title || "Training video preview"}
                        src={resolvePrototypeSectionVideoEmbed(section)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {section.isQuiz ? (
                    <div className="trainingPrototypeQuizPreview trainingPrototypeQuizPreviewCentered">
                      {sectionComplete ? (
                        <div className="trainingPrototypeSuccessBox" role="status">
                          Quiz submitted.
                        </div>
                      ) : (
                        <TrainingPrototypeQuizForm
                          quizQuestions={getPrototypeSectionQuiz(section)}
                          centered
                          formId={`trainingPrototypeQuizPreview-${section.id}`}
                        />
                      )}
                    </div>
                  ) : null}

                  {canViewSectionAckRoster ? (
                    <TrainingPrototypeSectionAckStatus roster={sectionCompletionRosters[section.id]} />
                  ) : null}

                  {section.isQuiz ? (
                    <div className="trainingPrototypeSectionActions">
                      <div className="trainingPrototypeSectionFooter">
                        <button
                          type="button"
                          className={sectionComplete ? "btn" : "btn btnPrimary"}
                          disabled={sectionComplete}
                          onClick={() => onMarkSectionRead?.(section.id)}
                        >
                          {sectionComplete
                            ? section.showVideo
                              ? "Video marked as watched"
                              : "Section marked as read"
                            : section.showVideo
                              ? "Mark video as watched"
                              : "Mark section as read"}
                        </button>
                        <TrainingPrototypeFullSessionButton
                          label="Open Quiz ↗"
                          onClick={() => onOpenQuiz(module.id)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="trainingPrototypeSectionActions">
                      <div className="trainingPrototypeSectionFooter">
                        <button
                          type="button"
                          className={sectionComplete ? "btn" : "btn btnPrimary"}
                          disabled={sectionComplete}
                          onClick={() => onMarkSectionRead?.(section.id)}
                        >
                          {sectionComplete
                            ? section.showVideo
                              ? "Video marked as watched"
                              : "Section marked as read"
                            : section.showVideo
                              ? "Mark video as watched"
                              : "Mark section as read"}
                        </button>
                        <TrainingPrototypeFullSessionButton
                          label="Open Training Section ↗"
                          onClick={() => onOpenFullSession(module.id, section.id)}
                        />
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

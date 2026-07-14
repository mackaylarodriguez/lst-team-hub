import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import TrainingPrototypeBlockExtras from "./TrainingPrototypeBlockExtras";

function normalizeHeading(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[!?.:]+$/g, "");
}

function shouldShowBlockHeading(block, sectionTitle) {
  if (block.hideHeading || !block.heading) return false;
  if (!sectionTitle) return true;
  return normalizeHeading(block.heading) !== normalizeHeading(sectionTitle);
}

export default function TrainingPrototypeWrittenBlocks({ blocks = [], sectionTitle }) {
  if (!blocks.length) return null;

  const hasCards = blocks.some((block) => block.card);

  return (
    <div
      className={
        hasCards
          ? "trainingPrototypeWrittenBody trainingPrototypeTimelineCardStack"
          : "trainingPrototypeWrittenBody"
      }
    >
      {blocks.map((block, blockIndex) => {
        const toneClass =
          block.cardTone === "discuss"
            ? " trainingPrototypeContentCardToneDiscuss"
            : block.cardTone === "scripture"
              ? " trainingPrototypeContentCardToneScripture"
              : block.cardTone === "reminder"
                ? " trainingPrototypeContentCardToneReminder"
                : "";
        const sectionClassName = block.card
          ? `trainingPrototypeWrittenSection trainingPrototypeTimelineCard${toneClass}`
          : "trainingPrototypeWrittenSection";
        const showHeading = shouldShowBlockHeading(block, sectionTitle);

        return (
          <div key={block.heading || `block-${blockIndex}`} className={sectionClassName}>
            {showHeading ? (
              block.card ? (
                <p className="trainingPrototypeTimelineCardTitle">{block.heading}</p>
              ) : (
                <h3>{block.heading}</h3>
              )
            ) : null}
            <TrainingPrototypeRichText text={block.body} />
            <TrainingPrototypeBlockExtras block={block} />
          </div>
        );
      })}
    </div>
  );
}

import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import TrainingPrototypeBlockExtras from "./TrainingPrototypeBlockExtras";

function normalizeHeading(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[!?.:]+$/g, "");
}

function shouldShowBlockHeading(block, sectionTitle) {
  if (block.collapsible || block.hideHeading || !block.heading) return false;
  if (!sectionTitle) return true;
  return normalizeHeading(block.heading) !== normalizeHeading(sectionTitle);
}

function SampleCollapsible({ title, body, className = "" }) {
  return (
    <CollapsibleSection
      variant="slim"
      title={title}
      defaultOpen={false}
      className={["trainingPrototypeSampleCollapse", className].filter(Boolean).join(" ")}
    >
      <TrainingPrototypeRichText text={body} />
    </CollapsibleSection>
  );
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
        const samples = Array.isArray(block.samples) ? block.samples : [];

        return (
          <div key={block.heading || `block-${blockIndex}`} className={sectionClassName}>
            {block.collapsible ? (
              <SampleCollapsible title={block.heading} body={block.body} />
            ) : (
              <>
                {showHeading ? (
                  block.card ? (
                    <p className="trainingPrototypeTimelineCardTitle">{block.heading}</p>
                  ) : (
                    <h3>{block.heading}</h3>
                  )
                ) : null}
                <TrainingPrototypeRichText text={block.body} />
                <TrainingPrototypeBlockExtras block={block} />
              </>
            )}
            {samples.length ? (
              <div className="trainingPrototypeSampleStack">
                {samples.map((sample) => (
                  <SampleCollapsible
                    key={sample.title}
                    title={sample.title}
                    body={sample.body}
                    className="trainingPrototypeSampleItem"
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

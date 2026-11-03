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

function SampleCollapsible({ title, body, embedUrl, short = false, className = "" }) {
  return (
    <CollapsibleSection
      variant="slim"
      title={title}
      defaultOpen={false}
      className={["trainingPrototypeSampleCollapse", className].filter(Boolean).join(" ")}
    >
      {body ? <TrainingPrototypeRichText text={body} /> : null}
      {embedUrl ? (
        <div
          className={[
            "trainingPrototypeVideoWrap",
            short ? "trainingPrototypeVideoWrapShort" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <iframe
            title={title}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : null}
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
        const videos = Array.isArray(block.videos) ? block.videos : [];

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
            {videos.length ? (
              <div className="trainingPrototypeSampleStack">
                {videos.map((video) => (
                  <SampleCollapsible
                    key={video.title}
                    title={video.title}
                    embedUrl={video.embedUrl}
                    short={Boolean(video.short)}
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

import TrainingPrototypeRichText from "./TrainingPrototypeRichText";
import TrainingPrototypeBlockExtras from "./TrainingPrototypeBlockExtras";

export default function TrainingPrototypeWrittenBlocks({ blocks = [] }) {
  if (!blocks.length) return null;

  return (
    <div className="trainingPrototypeWrittenBody">
      {blocks.map((block, blockIndex) => {
        const sectionClassName = block.card
          ? "trainingPrototypeWrittenSection trainingPrototypeTimelineCard"
          : "trainingPrototypeWrittenSection";
        const showHeading = !block.hideHeading && block.heading;

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

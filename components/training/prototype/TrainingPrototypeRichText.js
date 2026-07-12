function renderPrototypeRichInline(text) {
  const parts = String(text || "").split(/(\*\*.+?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderPrototypeRichBlock(paragraph, index) {
  const lines = String(paragraph || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
    return (
      <ul key={index}>
        {lines.map((line, lineIndex) => (
          <li key={lineIndex}>{renderPrototypeRichInline(line.slice(2))}</li>
        ))}
      </ul>
    );
  }

  return <p key={index}>{renderPrototypeRichInline(paragraph.replace(/\n+/g, " ").trim())}</p>;
}

export default function TrainingPrototypeRichText({ text, className }) {
  const paragraphs = String(text || "")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={className ? `trainingPrototypeRichText ${className}` : "trainingPrototypeRichText"}>
      {paragraphs.map((paragraph, index) => renderPrototypeRichBlock(paragraph, index))}
    </div>
  );
}

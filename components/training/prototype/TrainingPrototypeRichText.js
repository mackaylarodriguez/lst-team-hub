function renderPrototypeRichInline(text) {
  const parts = String(text || "").split(/(\*\*.+?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function TrainingPrototypeRichText({ text, className }) {
  const paragraphs = String(text || "")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={className ? `trainingPrototypeRichText ${className}` : "trainingPrototypeRichText"}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderPrototypeRichInline(paragraph)}</p>
      ))}
    </div>
  );
}

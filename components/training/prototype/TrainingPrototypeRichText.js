function renderPrototypeRichInline(text) {
  const parts = String(text || "").split(/(\*\*.+?\*\*|_.+?_|\[.+?\]\(.+?\))/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    return part;
  });
}

const TIMELINE_HEADING_PATTERN =
  /^(three months from departure|two months from departure|one month from departure|october\/november|january|february|march|april|may)$/i;

function stripPrototypeMarkers(text) {
  return String(text || "")
    .trim()
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "");
}

function looksLikeTimelineHeading(text) {
  const normalized = stripPrototypeMarkers(text);
  return TIMELINE_HEADING_PATTERN.test(normalized) || /from departure$/i.test(normalized);
}

function expandInlineDashLists(text) {
  return String(text || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("- ") || !trimmed.includes(" - ")) return line;

      const dashParts = trimmed
        .split(" - ")
        .map((part) => part.trim())
        .filter(Boolean);
      if (dashParts.length < 2 || !looksLikeTimelineHeading(dashParts[0])) return line;

      const heading = dashParts[0].startsWith("**") ? dashParts[0] : `**${dashParts[0]}**`;
      return [heading, ...dashParts.slice(1).map((item) => `- ${item}`)].join("\n");
    })
    .join("\n");
}

function renderPrototypeRichBlock(paragraph, index) {
  const trimmed = String(paragraph || "").trim();
  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (/^__.+__$/.test(trimmed)) {
    return (
      <p key={index} className="trainingPrototypeRichTitle">
        {trimmed.slice(2, -2)}
      </p>
    );
  }

  const bulletLines = lines.filter((line) => line.startsWith("- "));
  const nonBulletLines = lines.filter((line) => !line.startsWith("- "));

  if (bulletLines.length > 0) {
    return (
      <div key={index} className="trainingPrototypeRichBlockGroup">
        {nonBulletLines.map((line, lineIndex) => (
          <p key={`heading-${lineIndex}`}>{renderPrototypeRichInline(line)}</p>
        ))}
        <ul>
          {bulletLines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderPrototypeRichInline(line.slice(2))}</li>
          ))}
        </ul>
      </div>
    );
  }

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
  const normalizedText = expandInlineDashLists(text);
  const paragraphs = String(normalizedText || "")
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

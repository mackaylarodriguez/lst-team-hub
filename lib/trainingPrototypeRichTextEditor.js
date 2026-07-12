export function youtubeUrlToEmbedUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";

  if (trimmed.includes("youtube-nocookie.com/embed/")) {
    return trimmed;
  }

  if (trimmed.includes("youtube.com/embed/")) {
    return trimmed.replace("www.youtube.com", "www.youtube-nocookie.com");
  }

  let videoId = null;
  const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch) videoId = shortMatch[1];

  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (!videoId && watchMatch) videoId = watchMatch[1];

  const embedMatch = trimmed.match(/embed\/([^?&/]+)/);
  if (!videoId && embedMatch) videoId = embedMatch[1];

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : trimmed;
}

export function embedUrlToYoutubeUrl(embedUrl) {
  const match = String(embedUrl || "").match(/embed\/([^?&/]+)/);
  return match ? `https://youtu.be/${match[1]}` : String(embedUrl || "");
}

export function transformSelectedLines(value, selectionStart, selectionEnd, mapLine) {
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndCandidate = value.indexOf("\n", end);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const nextLines = lines.map((line, index) => mapLine(line, index, lines.length));
  const nextBlock = nextLines.join("\n");
  const nextText = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;

  return {
    text: nextText,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  };
}

export function wrapSelection(value, selectionStart, selectionEnd, markerStart, markerEnd, placeholderText) {
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const selected = value.slice(start, end);
  const inner = selected || placeholderText;
  const replacement = `${markerStart}${inner}${markerEnd}`;
  const text = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  const innerStart = start + markerStart.length;
  const innerEnd = innerStart + inner.length;

  return {
    text,
    selectionStart: innerStart,
    selectionEnd: innerEnd,
  };
}

export function insertLink(value, selectionStart, selectionEnd) {
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const selected = value.slice(start, end);
  const label = selected || "link text";
  const href = "https://";
  const replacement = `[${label}](${href})`;
  const text = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  const hrefStart = start + label.length + 3;
  const hrefEnd = hrefStart + href.length;

  return {
    text,
    selectionStart: hrefStart,
    selectionEnd: hrefEnd,
  };
}

export function applyTextareaTransform(textarea, value, transform, onChange) {
  if (!textarea) return;

  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const result = transform({
    value: String(value || ""),
    selectionStart,
    selectionEnd,
  });

  if (!result || typeof result.text !== "string") return;

  onChange(result.text);

  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}

import { useRef } from "react";
import {
  applyTextareaTransform,
  insertLink,
  transformSelectedLines,
  wrapSelection,
} from "@/lib/trainingPrototypeRichTextEditor";

export default function TrainingPrototypeRichTextEditor({
  value,
  onChange,
  rows = 10,
  required = false,
  placeholder = "",
  helperText = "Use the toolbar for formatting. Blank lines separate paragraphs.",
}) {
  const textareaRef = useRef(null);

  function runTransform(transform) {
    applyTextareaTransform(textareaRef.current, value, transform, onChange);
  }

  function formatBold() {
    runTransform(({ value: currentValue, selectionStart, selectionEnd }) =>
      wrapSelection(currentValue, selectionStart, selectionEnd, "**", "**", "bold text")
    );
  }

  function formatItalic() {
    runTransform(({ value: currentValue, selectionStart, selectionEnd }) =>
      wrapSelection(currentValue, selectionStart, selectionEnd, "_", "_", "italic text")
    );
  }

  function formatBullet() {
    runTransform(({ value: currentValue, selectionStart, selectionEnd }) =>
      transformSelectedLines(currentValue, selectionStart, selectionEnd, (line) => {
        if (!String(line || "").trim()) return line;
        return line.startsWith("- ") ? line : `- ${line}`;
      })
    );
  }

  function formatLink() {
    runTransform(({ value: currentValue, selectionStart, selectionEnd }) =>
      insertLink(currentValue, selectionStart, selectionEnd)
    );
  }

  return (
    <div className="trainingPrototypeRichTextEditor">
      <div className="trainingPrototypeRichTextToolbar" role="toolbar" aria-label="Formatting">
        <button type="button" className="btn trainingPrototypeRichTextToolBtn" onClick={formatBold} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="btn trainingPrototypeRichTextToolBtn" onClick={formatItalic} title="Italic">
          <em>I</em>
        </button>
        <button type="button" className="btn trainingPrototypeRichTextToolBtn" onClick={formatBullet} title="Bullet list">
          • List
        </button>
        <button type="button" className="btn trainingPrototypeRichTextToolBtn" onClick={formatLink} title="Insert link">
          Link
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="input trainingPrototypeEditTextarea trainingPrototypeRichTextArea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        placeholder={placeholder}
      />
      {helperText ? <span className="small trainingPrototypeMuted">{helperText}</span> : null}
    </div>
  );
}

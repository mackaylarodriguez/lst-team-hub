export default function TrainingPrototypeBlockExtras({ block }) {
  if (!block?.linkButton && !block?.addressCard) return null;

  return (
    <>
      {block.linkButton ? (
        <div className="trainingPrototypeBlockLinkRow">
          <a
            className="btn btnPrimary"
            href={block.linkButton.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {block.linkButton.label}
          </a>
        </div>
      ) : null}
      {block.addressCard?.lines?.length ? (
        <div className="trainingPrototypeAddressCardWrap">
          <div className="trainingPrototypeAddressCard">
            {block.addressCard.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

import AppIcon from "@/components/AppIcon";

export default function EmptyState({
  icon = "empty",
  title,
  description,
  action = null,
}) {
  return (
    <div className="emptyState">
      <div className="emptyStateIconWrap">
        <AppIcon name={icon} className="emptyStateIcon" />
      </div>
      <div className="emptyStateTitle">{title}</div>
      {description ? <div className="emptyStateDescription">{description}</div> : null}
      {action ? <div className="emptyStateAction">{action}</div> : null}
    </div>
  );
}

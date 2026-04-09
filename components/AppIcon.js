export default function AppIcon({ name, className = "" }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (name === "active") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M4 12h4l2-5 4 10 2-5h4" />
      </svg>
    );
  }

  if (name === "past") {
    return (
      <svg {...commonProps} className={className}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "archived") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M4 7.5h16" />
        <path d="M6 7.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5" />
        <path d="M9.5 4h5" />
      </svg>
    );
  }

  if (name === "workers") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M16.5 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M3.5 18.5c.7-2.7 2.8-4 5-4s4.3 1.3 5 4" />
        <path d="M13.5 18.5c.5-1.9 2-2.9 3.6-2.9 1.4 0 2.6.7 3.4 2.1" />
      </svg>
    );
  }

  if (name === "recruiting") {
    return (
      <svg {...commonProps} className={className}>
        <circle cx="10" cy="10" r="5.5" />
        <path d="m14 14 6 6" />
      </svg>
    );
  }

  if (name === "duplicate") {
    return (
      <svg {...commonProps} className={className}>
        <rect x="5" y="7" width="10" height="10" rx="2" />
        <path d="M9 5h8a2 2 0 0 1 2 2v8" />
      </svg>
    );
  }

  if (name === "empty") {
    return (
      <svg {...commonProps} className={className}>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M12 3.5 13.8 8l4.7 1.7L13.8 11.5 12 16l-1.8-4.5L5.5 9.7 10.2 8 12 3.5Z" />
      </svg>
    );
  }

  if (name === "pencil" || name === "edit") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    );
  }

  if (name === "money" || name === "budget") {
    return (
      <svg {...commonProps} className={className}>
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

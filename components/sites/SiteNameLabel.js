import { isBuiltInPartnerSiteLabel } from "@/lib/siteOptions";

/** Renders a site label with a star for built-in partner sites. */
export default function SiteNameLabel({ siteLabel, className = "" }) {
  const label = String(siteLabel || "").trim();
  const isPartner = isBuiltInPartnerSiteLabel(label);
  return (
    <span className={className || undefined}>
      {isPartner ? (
        <span className="sitesPartnerStar" title="Partner Site" aria-label="Partner Site">
          ★{" "}
        </span>
      ) : null}
      {label}
    </span>
  );
}

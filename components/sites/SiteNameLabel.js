import { isPartnerSiteType } from "@/lib/siteOptions";

/** Renders a site label with a star when site type is Partner Site. */
export default function SiteNameLabel({ siteLabel, siteType = "", className = "" }) {
  const label = String(siteLabel || "").trim();
  const showStar = isPartnerSiteType(siteType);
  return (
    <span className={className || undefined}>
      {showStar ? (
        <span className="sitesPartnerStar" title="Partner Site" aria-label="Partner Site">
          ★{" "}
        </span>
      ) : null}
      {label}
    </span>
  );
}

import Link from "next/link";

export default function TrainingStaffTripCell({ tripId, tripName, siteLocation }) {
  const label = tripName || "Untitled trip";

  return (
    <>
      <div style={{ fontWeight: 700 }}>
        {tripId ? (
          <Link href={`/trips/${encodeURIComponent(tripId)}`}>
            {label}
          </Link>
        ) : (
          label
        )}
      </div>
      {siteLocation ? <div className="small trainingPrototypeMuted">{siteLocation}</div> : null}
    </>
  );
}

export default function TrainingStaffTripCell({ tripName, siteLocation }) {
  return (
    <>
      <div style={{ fontWeight: 700 }}>{tripName}</div>
      {siteLocation ? <div className="small trainingPrototypeMuted">{siteLocation}</div> : null}
    </>
  );
}

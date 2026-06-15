export default function TrainingPrototypeStaffTripCell({ tripName, siteLocation }) {
  return (
    <>
      <div style={{ fontWeight: 700 }}>{tripName}</div>
      <div className="small trainingPrototypeMuted">{siteLocation}</div>
    </>
  );
}

export default function TrainingStaffSearchBar({ value, onChange, compact = false }) {
  return (
    <div
      className={
        "trainingPrototypeStaffSearchWrap" +
        (compact ? " trainingPrototypeStaffSearchWrapCompact" : "")
      }
    >
      <label className="trainingPrototypeStaffSearchLabel" htmlFor="trainingWorkerSearch">
        Search workers
      </label>
      <input
        id="trainingWorkerSearch"
        type="search"
        className="input trainingPrototypeStaffSearchInput"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by worker, trip, or site"
        autoComplete="off"
      />
    </div>
  );
}

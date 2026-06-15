import { useState } from "react";

export default function TrainingPrototypeStaffSearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="trainingPrototypeStaffSearchWrap">
      <label className="trainingPrototypeStaffSearchLabel" htmlFor="trainingPrototypeWorkerSearch">
        Search workers
      </label>
      <input
        id="trainingPrototypeWorkerSearch"
        type="search"
        className="input trainingPrototypeStaffSearchInput"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by worker name"
        autoComplete="off"
      />
      <p className="small trainingPrototypeMuted trainingPrototypeStaffSearchHint">
        Layout preview only — search is not connected yet.
      </p>
    </div>
  );
}

import { formatUsdNumber } from "@/lib/budgetMoney";

function formatGoalAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return formatUsdNumber(n);
}

/**
 * Compact Name → goal list under a fundraising total.
 */
export default function FundraisingWorkerGoalList({ workers, className = "" }) {
  const list = Array.isArray(workers) ? workers : [];
  if (!list.length) {
    return (
      <div className={`fundraisingWorkerGoalList fundraisingWorkerGoalListEmpty ${className}`.trim()}>
        No worker fundraising goals yet.
      </div>
    );
  }

  return (
    <ul className={`fundraisingWorkerGoalList ${className}`.trim()}>
      {list.map((worker) => (
        <li key={worker.email || worker.name} className="fundraisingWorkerGoalRow">
          <span className="fundraisingWorkerGoalName">{worker.name || worker.email || "Worker"}</span>
          <span className="fundraisingWorkerGoalAmount">{formatGoalAmount(worker.fundraisingGoalAmount)}</span>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";

export default function TrainingWorkerNameCell({ userId, name, email }) {
  const label = name || email || "Worker";

  return (
    <>
      <div style={{ fontWeight: 700 }}>
        {userId ? (
          <Link href={`/profile?participantId=${encodeURIComponent(userId)}`}>
            {label}
          </Link>
        ) : (
          label
        )}
      </div>
      {email ? <div className="small trainingPrototypeMuted">{email}</div> : null}
    </>
  );
}

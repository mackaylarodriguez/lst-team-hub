import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getSession, requireSession } from "@/lib/auth";
import { SAMPLE } from "@/lib/sampleData";

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = requireSession(router);
    const sess = getSession();
    setSession(sess);
    if (sess?.role !== "staff") router.replace("/trips");
  }, [router]);

  return (
    <Shell>
      <h1 className="h1">Admin</h1>
      <p className="p">Staff-only demo page: shows what an admin console could look like.</p>

      <div style={{ height: 14 }} />
      <div className="card pad">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Trips</div>
        <table className="table">
          <thead>
            <tr><th>Trip</th><th>Dates</th><th>Location</th><th>Participants</th></tr>
          </thead>
          <tbody>
            {SAMPLE.trips.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 900 }}>{t.name}</td>
                <td>{t.dates}</td>
                <td>{t.location}</td>
                <td>{t.participants.length}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="small" style={{ marginTop: 12 }}>
          Real version: create/edit trips, bulk-add participants, set tasks/links, export status.
        </div>
      </div>
    </Shell>
  );
}

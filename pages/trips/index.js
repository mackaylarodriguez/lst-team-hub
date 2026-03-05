import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { requireSession } from "@/lib/auth";
import { SAMPLE } from "@/lib/sampleData";

export default function Trips() {
  const router = useRouter();
  const session = useMemo(() => null, []);
  useEffect(() => { requireSession(router); }, [router]);

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="h1">My Trips</h1>
          <p className="p">Everything you need for your team, in one place.</p>
        </div>
        <div className="spacer" />
        <span className="badge">Demo</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {SAMPLE.trips.map(trip => (
          <div key={trip.id} className="card pad">
            <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
            <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
            <div className="small">{trip.dates}</div>
            <div style={{ height: 12 }} />
            <Link className="btn btnPrimary" href={`/trips/${trip.id}`}>View Trip</Link>
          </div>
        ))}
      </div>
    </Shell>
  );
}

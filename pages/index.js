import { useEffect } from "react";
import { useRouter } from "next/router";
import { getSession } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;

    async function routeUser() {
      const session = await getSession();
      if (!cancelled) {
        router.replace(session ? "/trips" : "/login");
      }
    }

    routeUser();

    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}

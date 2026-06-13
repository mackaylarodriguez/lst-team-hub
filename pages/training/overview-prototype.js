import { useRouter } from "next/router";
import { useEffect } from "react";

/** Legacy route — staff training prototype now lives at /training */
export default function TrainingOverviewPrototypeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/training");
  }, [router]);

  return null;
}

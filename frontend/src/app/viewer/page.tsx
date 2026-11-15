import { Suspense } from "react";
import Explore from "@/components/explore/Explore";
import "../explore.css";

export const metadata = {
  title: "Stage 5: Explore · Star Detective",
  description: "Enter any sky coordinates and play every SPHEREx image of that spot like a flip-book to spot moving objects.",
};

function Fallback() {
  return (
    <div className="explore ex-fallback" role="status">
      Loading the SPHEREx explorer…
    </div>
  );
}

/** useSearchParams needs a Suspense boundary; the page state lives in the query string. */
export default function ViewerPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <Explore />
    </Suspense>
  );
}

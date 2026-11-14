import { Suspense } from "react";
import { CardEditor } from "./card-editor";

export default function NewCardPage() {
  // useSearchParams() is request data, so it needs a Suspense boundary (Cache Components).
  return (
    <Suspense fallback={null}>
      <CardEditor />
    </Suspense>
  );
}

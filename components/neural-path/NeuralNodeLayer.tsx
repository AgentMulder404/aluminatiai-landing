"use client";

import dynamic from "next/dynamic";

const NeuralNodeAnchor = dynamic(() => import("./NeuralNodeAnchor"), {
  ssr: false,
});

const SECTION_IDS = [
  "hero",
  "problem",
  "how-it-works",
  "features",
  "built-for-ai",
  "free-trial",
  "closing-cta",
];

export default function NeuralNodeLayer() {
  return (
    <>
      {SECTION_IDS.map((id) => (
        <NeuralNodeAnchor key={id} sectionId={id} />
      ))}
    </>
  );
}

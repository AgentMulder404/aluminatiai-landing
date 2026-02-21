"use client";

import { useEffect, useRef } from "react";
import { useNeuralPath } from "./NeuralPathProvider";

const SECTION_IDS = [
  "hero",
  "problem",
  "how-it-works",
  "features",
  "built-for-ai",
  "free-trial",
  "closing-cta",
];

export default function ScrollObserver() {
  const { activateNode } = useNeuralPath();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Hero activates immediately
    activateNode("hero");

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      // Activate all nodes instantly
      SECTION_IDS.forEach((id) => activateNode(id));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activateNode(entry.target.id);
          }
        });
      },
      { threshold: 0.7 }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [activateNode]);

  return null;
}

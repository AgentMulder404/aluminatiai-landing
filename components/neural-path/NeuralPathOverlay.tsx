"use client";

import dynamic from "next/dynamic";
import SynapseWireLayer from "./SynapseWireLayer";
import BloomFlash from "./BloomFlash";
import NetworkMap from "./NetworkMap";
import ScrollObserver from "./ScrollObserver";

const NeuralNodeLayer = dynamic(() => import("./NeuralNodeLayer"), {
  ssr: false,
});

export default function NeuralPathOverlay() {
  return (
    <>
      <NeuralNodeLayer />
      <SynapseWireLayer />
      <BloomFlash />
      <NetworkMap />
      <ScrollObserver />
    </>
  );
}

import { simplexNoise3D } from "./noise.glsl";

export const terrainVertexShader = /* glsl */ `
${simplexNoise3D}

uniform float uTime;
uniform float uSmoothness;
uniform vec2 uMouseUV;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uRippleTime;
uniform float uCTAFired;

varying float vHeight;
varying float vMouseProximity;
varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 pos = position;

  // Chaos noise — high freq, high amplitude (dominant at smoothness=0)
  float chaos = snoise(vec3(pos.x * 1.2, pos.y * 1.2, uTime * 0.3)) * 2.5
              + snoise(vec3(pos.x * 2.5, pos.y * 2.5, uTime * 0.5)) * 1.2
              + snoise(vec3(pos.x * 5.0, pos.y * 5.0, uTime * 0.8)) * 0.4;

  // Hill noise — low freq, gentle (dominant at smoothness=1)
  float hills = snoise(vec3(pos.x * 0.3, pos.y * 0.3, uTime * 0.08)) * 1.8
              + snoise(vec3(pos.x * 0.6, pos.y * 0.6, uTime * 0.12)) * 0.6;

  // Blend chaos vs hills based on smoothness
  float height = mix(chaos, hills, uSmoothness);

  // Ripple wave — sweeps left to right, smoothing terrain behind wavefront
  float ripplePos = (uRippleTime > 0.0) ? -20.0 + uRippleTime * 12.0 : -999.0;
  float rippleFactor = smoothstep(ripplePos - 3.0, ripplePos, pos.x);
  height = mix(height, hills, rippleFactor * step(0.01, uRippleTime) * (1.0 - uSmoothness));

  // CTA lock — lerp toward calm hills
  height = mix(height, hills * 0.8, uCTAFired);

  // Mouse bloom — lift vertices near cursor
  vec2 mouseWorld = vec2(
    (uMouseUV.x - 0.5) * 40.0,
    (uMouseUV.y - 0.5) * 20.0
  );
  float dist = distance(pos.xy, mouseWorld);
  float bloom = smoothstep(uMouseRadius, 0.0, dist) * uMouseStrength;
  height += bloom;

  vMouseProximity = smoothstep(uMouseRadius * 1.5, 0.0, dist);

  pos.z = height;
  vHeight = height;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const terrainFragmentShader = /* glsl */ `
uniform float uSmoothness;
uniform float uCTAFired;
uniform sampler2D uLatinTexture;
uniform vec2 uMouseUV;

varying float vHeight;
varying float vMouseProximity;
varying vec2 vUv;

void main() {
  // Thermal palette (smoothness ≈ 0)
  vec3 thermalLow = vec3(0.6, 0.1, 0.0);    // dark red
  vec3 thermalMid = vec3(0.9, 0.3, 0.0);     // orange
  vec3 thermalHigh = vec3(1.0, 0.6, 0.1);    // yellow-orange

  float hNorm = clamp((vHeight + 3.0) / 7.0, 0.0, 1.0);
  vec3 thermal = mix(thermalLow, thermalMid, smoothstep(0.0, 0.4, hNorm));
  thermal = mix(thermal, thermalHigh, smoothstep(0.4, 0.8, hNorm));

  // Green palette (smoothness ≈ 1)
  vec3 greenLow = vec3(0.02, 0.12, 0.05);    // dark green
  vec3 greenMid = vec3(0.08, 0.35, 0.15);    // forest green
  vec3 greenHigh = vec3(0.15, 0.55, 0.25);   // bright green
  vec3 greenPeak = vec3(0.6, 0.85, 0.7);     // light peak

  vec3 green = mix(greenLow, greenMid, smoothstep(0.0, 0.3, hNorm));
  green = mix(green, greenHigh, smoothstep(0.3, 0.6, hNorm));
  green = mix(green, greenPeak, smoothstep(0.7, 1.0, hNorm));

  // Blend thermal ↔ green
  vec3 color = mix(thermal, green, uSmoothness);

  // CTA lock shifts to pure green
  color = mix(color, green, uCTAFired);

  // Mouse glow — brighter, cooler near cursor
  vec3 glowColor = mix(vec3(0.2, 0.8, 0.4), vec3(0.4, 0.9, 0.6), vMouseProximity);
  color = mix(color, glowColor, vMouseProximity * 0.5);

  // Latin text SDF reveal near cursor
  vec4 latin = texture2D(uLatinTexture, vUv);
  float textReveal = latin.r * vMouseProximity * smoothstep(0.0, 0.3, vMouseProximity);
  color = mix(color, vec3(0.85, 0.95, 0.88), textReveal * 0.7);

  // Edge fade — alpha falloff at plane edges
  float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x)
                 * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);

  gl_FragColor = vec4(color, edgeFade * 0.85);
}
`;

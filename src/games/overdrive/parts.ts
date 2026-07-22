import * as THREE from 'three';
import { buildWheel, mergeParts, shadedPrism } from './mesh';
import type { UVRect, WheelStyle } from './mesh';
import type { PecaAro, PecaAerofolio } from '../../data/overdrive';

export interface CarColors {
  paint: THREE.Color;
  trim: THREE.Color;
  tire: THREE.Color;
}

export interface CarAnchors {
  halfWidth: number;
  deckY: number;
  deckZ: number;
  rearZ: number;
  frontZ: number;
  sillY: number;
  wheelRadius: number;
  wheelWidth: number;
}

export function buildRim(def: PecaAro, colors: CarColors, anchors: CarAnchors, hubcapUV: UVRect, rimFaceUV: UVRect): THREE.BufferGeometry {
  const style: WheelStyle = {
    radius: anchors.wheelRadius,
    width: anchors.wheelWidth,
    rimRadius: anchors.wheelRadius * 0.65,
    dishDepth: def.dish,
    spokes: def.spokes,
    spokeWidth: def.spokeWidth,
    segments: 14,
    tireColor: colors.tire,
    rimColor: new THREE.Color(def.rimColor),
    spokeColor: new THREE.Color(def.spokeColor),
    hubColor: new THREE.Color('#2a2b31'),
    faceUV: def.spokes === 0 ? hubcapUV : rimFaceUV,
  };
  return buildWheel(style);
}

export function buildSpoiler(def: PecaAerofolio, colors: CarColors, a: CarAnchors): THREE.BufferGeometry {
  const color = def.usePaint ? colors.paint : colors.trim;
  const parts: THREE.BufferGeometry[] = [];
  if (def.style === 'ducktail') {
    parts.push(
      shadedPrism(def.span, 0.07, def.chord, 0, a.deckY + 0.02, a.rearZ - def.chord / 2 - 0.04, color, { yBack: def.height, sx: 0.94 }),
    );
  } else {
    const z = a.rearZ - def.chord / 2 - 0.08;
    const bladeY = a.deckY + def.height;
    parts.push(
      shadedPrism(0.08, def.height, 0.2, -(def.span / 2 - 0.18), a.deckY + def.height / 2 - 0.02, z, colors.trim),
      shadedPrism(0.08, def.height, 0.2, def.span / 2 - 0.18, a.deckY + def.height / 2 - 0.02, z, colors.trim),
      shadedPrism(def.span, 0.06, def.chord, 0, bladeY, z, color, { yFront: 0.05, sz: 0.9 }),
      shadedPrism(0.05, 0.16, def.chord * 0.85, -(def.span / 2), bladeY + 0.04, z, color),
      shadedPrism(0.05, 0.16, def.chord * 0.85, def.span / 2, bladeY + 0.04, z, color),
    );
  }
  return mergeParts(parts)!;
}

import type { HardwarePreset } from '../../../../shared/types';

/** Ridge point AI* = peak FLOPS / bandwidth. Below ridge = memory-bound. */
export function ridgeAI(hw: { peakTflops: number; bandwidthTBs: number }): number {
  return hw.peakTflops / hw.bandwidthTBs;
}

/** Roofline performance: min(peak, bw * ai). TFLOPS units. */
export function rooflinePerf(ai: number, hw: { peakTflops: number; bandwidthTBs: number }): number {
  return Math.min(hw.peakTflops, hw.bandwidthTBs * ai);
}

/** Bound classification at a single (ai, hw) pair. */
export function boundFor(ai: number, hw: { peakTflops: number; bandwidthTBs: number }): 'compute' | 'memory' {
  return ai < ridgeAI(hw) ? 'memory' : 'compute';
}

export interface LogScale {
  /** Map a domain value (>0) to a pixel coordinate. */
  (value: number): number;
  /** Domain min/max. */
  domain: readonly [number, number];
  /** Range min/max (pixels). */
  range: readonly [number, number];
}

/** Self-rolled log10 scale. Lighter than pulling in d3-scale just for this. */
export function logScale(
  domain: readonly [number, number],
  range: readonly [number, number]
): LogScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 <= 0 || d1 <= 0) {
    throw new Error('logScale domain must be strictly positive');
  }
  const logD0 = Math.log10(d0);
  const logD1 = Math.log10(d1);

  const fn = ((value: number) => {
    if (value <= 0) {
      return r0;
    }
    const t = (Math.log10(value) - logD0) / (logD1 - logD0);
    return r0 + t * (r1 - r0);
  }) as LogScale;
  fn.domain = [d0, d1] as const;
  fn.range = [r0, r1] as const;
  return fn;
}

/** Generate the polyline points for a single hardware roofline.
 * Returns at minimum [start, ridge, end] in domain coords. Caller maps via logScale. */
export function rooflinePolyline(
  hw: { peakTflops: number; bandwidthTBs: number },
  aiDomain: readonly [number, number]
): Array<{ ai: number; perf: number }> {
  const ridge = ridgeAI(hw);
  const points: Array<{ ai: number; perf: number }> = [
    { ai: aiDomain[0], perf: rooflinePerf(aiDomain[0], hw) }
  ];
  if (ridge > aiDomain[0] && ridge < aiDomain[1]) {
    points.push({ ai: ridge, perf: hw.peakTflops });
  }
  points.push({ ai: aiDomain[1], perf: rooflinePerf(aiDomain[1], hw) });
  return points;
}

/** Convenience: pick the default hardware from a preset list. */
export function pickDefaultHardware(presets: HardwarePreset[]): HardwarePreset {
  return presets.find((p) => p.isDefault) ?? presets[0];
}

/** Convenience: pick a default comparison hardware (≠ main, prefer marked). */
export function pickComparisonHardware(
  presets: HardwarePreset[],
  mainId: string
): HardwarePreset | null {
  return (
    presets.find((p) => p.id !== mainId && p.isComparisonDefault) ??
    presets.find((p) => p.id !== mainId) ??
    null
  );
}

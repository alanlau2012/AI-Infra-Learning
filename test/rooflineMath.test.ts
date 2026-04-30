import { describe, expect, it } from 'vitest';
import {
  boundFor,
  logScale,
  ridgeAI,
  rooflinePerf,
  rooflinePolyline
} from '../src/renderer/components/interactive/RooflineChart/roofline.math';

const H100 = { peakTflops: 989, bandwidthTBs: 3.35 };
const A910B3 = { peakTflops: 313, bandwidthTBs: 1.6 };

describe('roofline math', () => {
  it('computes ridge AI* and bound classification', () => {
    expect(ridgeAI(H100)).toBeCloseTo(989 / 3.35, 3);
    expect(ridgeAI(A910B3)).toBeCloseTo(313 / 1.6, 3);

    expect(boundFor(1.4, H100)).toBe('memory');
    expect(boundFor(500, H100)).toBe('compute');
    expect(boundFor(196, A910B3)).toBe('compute'); // exactly at ridge → compute
  });

  it('caps performance at peak and tracks bandwidth × AI below ridge', () => {
    expect(rooflinePerf(1, H100)).toBeCloseTo(3.35, 3);
    expect(rooflinePerf(10000, H100)).toBe(989);
    expect(rooflinePerf(ridgeAI(H100), H100)).toBeCloseTo(989, 3);
  });

  it('builds a polyline that includes the ridge when in domain', () => {
    const pts = rooflinePolyline(H100, [0.1, 1000]);
    expect(pts.length).toBe(3);
    expect(pts[1].ai).toBeCloseTo(ridgeAI(H100), 3);
    expect(pts[1].perf).toBe(989);
  });

  it('logScale maps endpoints correctly and is monotonic', () => {
    const s = logScale([0.1, 1000], [0, 800]);
    expect(s(0.1)).toBeCloseTo(0, 3);
    expect(s(1000)).toBeCloseTo(800, 3);
    expect(s(1)).toBeCloseTo(200, 3); // 1 decade out of 4
    expect(s(10)).toBeCloseTo(400, 3);
    expect(s(100)).toBeCloseTo(600, 3);
  });
});

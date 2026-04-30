import { useMemo } from 'react';
import type { HardwarePreset } from '../../../../shared/types';
import { logScale, ridgeAI, rooflinePerf, rooflinePolyline } from './roofline.math';

interface OperatingPoint {
  ai: number;
  perfTflops: number;
  label?: string;
  bound?: 'compute' | 'memory';
}

interface Props {
  mainHardware: HardwarePreset;
  comparisonHardware: HardwarePreset | null;
  point: OperatingPoint | null;
  width?: number;
  height?: number;
}

const AI_DOMAIN: readonly [number, number] = [0.1, 1000];
const PERF_DOMAIN: readonly [number, number] = [1, 10000];
const MARGIN = { top: 16, right: 24, bottom: 36, left: 56 } as const;

export default function ChartCanvas({
  mainHardware,
  comparisonHardware,
  point,
  width = 720,
  height = 380
}: Props) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const xScale = useMemo(() => logScale(AI_DOMAIN, [0, innerW]), [innerW]);
  const yScale = useMemo(() => logScale(PERF_DOMAIN, [innerH, 0]), [innerH]);

  const mainPath = useMemo(() => buildPath(mainHardware, xScale, yScale), [mainHardware, xScale, yScale]);
  const comparisonPath = useMemo(
    () => (comparisonHardware ? buildPath(comparisonHardware, xScale, yScale) : null),
    [comparisonHardware, xScale, yScale]
  );

  const xTicks = [0.1, 1, 10, 100, 1000];
  const yTicks = [1, 10, 100, 1000, 10000];

  const mainRidge = ridgeAI(mainHardware);
  const comparisonRidge = comparisonHardware ? ridgeAI(comparisonHardware) : null;

  return (
    <svg
      className="roofline-canvas"
      role="img"
      aria-label="Roofline chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
        {/* Grid */}
        {xTicks.map((tick) => (
          <line
            key={`gx-${tick}`}
            className="roofline-grid"
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={0}
            y2={innerH}
          />
        ))}
        {yTicks.map((tick) => (
          <line
            key={`gy-${tick}`}
            className="roofline-grid"
            x1={0}
            x2={innerW}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
        ))}

        {/* Axes */}
        <line className="roofline-axis" x1={0} x2={innerW} y1={innerH} y2={innerH} />
        <line className="roofline-axis" x1={0} x2={0} y1={0} y2={innerH} />

        {/* Tick labels */}
        {xTicks.map((tick) => (
          <text
            key={`tx-${tick}`}
            className="roofline-tick"
            x={xScale(tick)}
            y={innerH + 16}
            textAnchor="middle"
          >
            {tick}
          </text>
        ))}
        {yTicks.map((tick) => (
          <text
            key={`ty-${tick}`}
            className="roofline-tick"
            x={-8}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {tick}
          </text>
        ))}

        {/* Axis titles */}
        <text className="roofline-axis-title" x={innerW / 2} y={innerH + 32} textAnchor="middle">
          Arithmetic Intensity (FLOPs / Byte)
        </text>
        <text
          className="roofline-axis-title"
          transform={`translate(-44, ${innerH / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Performance (TFLOPS)
        </text>

        {/* Comparison roofline (drawn first, behind main) */}
        {comparisonPath && comparisonHardware ? (
          <g>
            <path
              className="roofline-line roofline-line-comparison"
              d={comparisonPath}
              stroke={comparisonHardware.color}
              fill="none"
              strokeDasharray="6 4"
            />
            {comparisonRidge && comparisonRidge >= AI_DOMAIN[0] && comparisonRidge <= AI_DOMAIN[1] ? (
              <circle
                className="roofline-ridge-dot"
                cx={xScale(comparisonRidge)}
                cy={yScale(comparisonHardware.peakTflops)}
                r={3}
                fill={comparisonHardware.color}
              />
            ) : null}
          </g>
        ) : null}

        {/* Main roofline */}
        <path
          className="roofline-line roofline-line-main"
          d={mainPath}
          stroke={mainHardware.color}
          fill="none"
        />
        <circle
          className="roofline-ridge-dot"
          cx={xScale(mainRidge)}
          cy={yScale(mainHardware.peakTflops)}
          r={4}
          fill={mainHardware.color}
        />
        <text
          className="roofline-ridge-label"
          x={xScale(mainRidge) + 8}
          y={yScale(mainHardware.peakTflops) - 8}
        >
          AI* ≈ {Math.round(mainRidge)}
        </text>

        {/* Operating point */}
        {point ? (
          <g className={`roofline-point bound-${point.bound ?? 'memory'}`}>
            <line
              className="roofline-point-projection"
              x1={xScale(point.ai)}
              x2={xScale(point.ai)}
              y1={yScale(point.perfTflops)}
              y2={innerH}
            />
            <line
              className="roofline-point-projection"
              x1={0}
              x2={xScale(point.ai)}
              y1={yScale(point.perfTflops)}
              y2={yScale(point.perfTflops)}
            />
            <circle
              className="roofline-point-dot"
              cx={xScale(point.ai)}
              cy={yScale(point.perfTflops)}
              r={6}
            />
            {point.label ? (
              <text
                className="roofline-point-label"
                x={xScale(point.ai) + 10}
                y={yScale(point.perfTflops) + 4}
              >
                {point.label}
              </text>
            ) : null}
          </g>
        ) : null}
      </g>
    </svg>
  );
}

function buildPath(
  hw: { peakTflops: number; bandwidthTBs: number },
  x: (v: number) => number,
  y: (v: number) => number
): string {
  const points = rooflinePolyline(hw, AI_DOMAIN);
  const cappedY = points.map((p) => ({ ai: p.ai, perf: Math.min(p.perf, PERF_DOMAIN[1]) }));
  return cappedY
    .map((pt, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      const perf = Math.max(pt.perf, PERF_DOMAIN[0]);
      return `${cmd}${x(pt.ai).toFixed(2)},${y(perf).toFixed(2)}`;
    })
    .join(' ');
}

export type { OperatingPoint };
export { rooflinePerf };

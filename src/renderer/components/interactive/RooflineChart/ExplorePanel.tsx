import { useMemo, useState } from 'react';
import type { ExploreScenario, HardwarePreset } from '../../../../shared/types';
import ChartCanvas from './ChartCanvas';
import { boundFor, pickComparisonHardware, pickDefaultHardware, rooflinePerf } from './roofline.math';

interface Props {
  hardwarePresets: HardwarePreset[];
  scenarios: ExploreScenario[];
}

const NO_COMPARE = '__none__';

export default function ExplorePanel({ hardwarePresets, scenarios }: Props) {
  const defaultMain = useMemo(() => pickDefaultHardware(hardwarePresets), [hardwarePresets]);
  const defaultCompare = useMemo(
    () => pickComparisonHardware(hardwarePresets, defaultMain.id),
    [hardwarePresets, defaultMain.id]
  );

  const [mainId, setMainId] = useState<string>(defaultMain.id);
  const [compareId, setCompareId] = useState<string>(defaultCompare?.id ?? NO_COMPARE);
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? '');

  const mainHardware = hardwarePresets.find((h) => h.id === mainId) ?? defaultMain;
  const comparisonHardware =
    compareId === NO_COMPARE ? null : hardwarePresets.find((h) => h.id === compareId) ?? null;
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const point = scenario
    ? {
        ai: scenario.ai,
        perfTflops: rooflinePerf(scenario.ai, mainHardware),
        bound: boundFor(scenario.ai, mainHardware),
        label: `${scenario.name} · AI=${scenario.ai} · ${
          boundFor(scenario.ai, mainHardware) === 'memory' ? 'memory-bound' : 'compute-bound'
        }`
      }
    : null;

  return (
    <div className="roofline-shell roofline-shell-explore">
      <div className="roofline-controls" role="group" aria-label="Roofline 探索控件">
        <label>
          <span>主硬件</span>
          <select value={mainId} onChange={(e) => setMainId(e.target.value)}>
            {hardwarePresets.map((hw) => (
              <option key={hw.id} value={hw.id}>
                {hw.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>对比硬件</span>
          <select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
            <option value={NO_COMPARE}>关闭对比</option>
            {hardwarePresets
              .filter((hw) => hw.id !== mainId)
              .map((hw) => (
                <option key={hw.id} value={hw.id}>
                  {hw.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>场景</span>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ChartCanvas
        mainHardware={mainHardware}
        comparisonHardware={comparisonHardware}
        point={point}
      />

      {point ? (
        <p className="roofline-explain" data-bound={point.bound}>
          <strong>{point.bound === 'memory' ? 'Memory-bound' : 'Compute-bound'}</strong>
          {' · '}
          <span>
            工作点 AI = {scenario?.ai}
            {point.bound === 'memory'
              ? ` 远低于 ${mainHardware.name} 拐点`
              : ` 已越过 ${mainHardware.name} 拐点`}
            {' '}({Math.round(mainHardware.peakTflops / mainHardware.bandwidthTBs)} FLOPs/Byte)。
          </span>
        </p>
      ) : null}
    </div>
  );
}

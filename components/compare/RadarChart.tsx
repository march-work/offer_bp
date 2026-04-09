'use client';

import type { CompareItem } from '@/lib/types';

interface Props {
  items: CompareItem[];
}

const RADAR_DIMS = [
  { key: 'score', label: '综合评分', getValue: (r: CompareItem['result']) => r.score, higherIsBetter: true },
  { key: 'tc', label: '年总包', getValue: (r: CompareItem['result']) => r.totalCompensation, higherIsBetter: true },
  { key: 'env', label: '环境系数', getValue: (r: CompareItem['result']) => r.envFactor, higherIsBetter: true },
  { key: 'hours', label: '工时友好', getValue: (r: CompareItem['result']) => r.effectiveHours, higherIsBetter: false },
  { key: 'city', label: '城市因子', getValue: (r: CompareItem['result']) => r.cityFactor, higherIsBetter: true },
  { key: 'industry', label: '行业因子', getValue: (r: CompareItem['result']) => r.industryFactor, higherIsBetter: true },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export function RadarChart({ items }: Props) {
  if (items.length === 0) return null;

  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const R = 140;
  const n = RADAR_DIMS.length;
  const startAngle = -Math.PI / 2;

  const getAngle = (i: number) => startAngle + (2 * Math.PI * i) / n;
  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  // Normalize each dimension to [0.15, 1] across items
  const normalized: number[][] = []; // [dimIdx][itemIdx]
  RADAR_DIMS.forEach((dim) => {
    const vals = items.map((it) => dim.getValue(it.result));
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const range = max - min;
    normalized.push(
      vals.map((v) => {
        if (range === 0) return 0.5; // all equal → middle
        let norm = (v - min) / range;
        if (!dim.higherIsBetter) norm = 1 - norm;
        return 0.15 + norm * 0.85;
      }),
    );
  });

  const gridPath = (ratio: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = polar(getAngle(i), R * ratio);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + 'Z';

  const itemPath = (itemIdx: number) =>
    Array.from({ length: n }, (_, dimIdx) => {
      const p = polar(getAngle(dimIdx), R * normalized[dimIdx][itemIdx]);
      return `${dimIdx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + 'Z';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">雷达图对比</h3>
        <p className="text-xs text-gray-400 mt-0.5">覆盖面积越大，综合表现越好</p>
      </div>

      <div className="flex flex-col items-center py-4 px-4">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[400px]">
          {/* Grid */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <path key={ratio} d={gridPath(ratio)} fill="none" stroke="#E5E7EB" strokeWidth={1} />
          ))}

          {/* Axis lines */}
          {Array.from({ length: n }, (_, i) => {
            const p = polar(getAngle(i), R);
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth={1} />;
          })}

          {/* Item polygons */}
          {items.map((item, itemIdx) => {
            const color = COLORS[itemIdx % COLORS.length];
            return (
              <g key={item.id}>
                <path d={itemPath(itemIdx)} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />
                {Array.from({ length: n }, (_, dimIdx) => {
                  const p = polar(getAngle(dimIdx), R * normalized[dimIdx][itemIdx]);
                  return <circle key={dimIdx} cx={p.x} cy={p.y} r={3.5} fill={color} />;
                })}
              </g>
            );
          })}

          {/* Labels */}
          {RADAR_DIMS.map((dim, i) => {
            const p = polar(getAngle(i), R + 30);
            const isLeft = p.x < cx - 5;
            const isRight = p.x > cx + 5;
            return (
              <text
                key={dim.key}
                x={p.x}
                y={p.y}
                textAnchor={isLeft ? 'end' : isRight ? 'start' : 'middle'}
                dominantBaseline="central"
                fill="#4B5563"
                fontSize={12}
              >
                {dim.label}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-xs text-gray-600 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

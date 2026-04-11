'use client';

import { useState } from 'react';
import type { CompareItem } from '@/lib/types';

interface Props {
  items: CompareItem[];
}

const RADAR_DIMS = [
  { key: 'score', label: '综合评分', getValue: (r: CompareItem['result']) => r.score, format: (v: number) => v.toFixed(2), higherIsBetter: true },
  { key: 'tc', label: '年总包', getValue: (r: CompareItem['result']) => r.totalCompensation, format: (v: number) => `${(v / 10000).toFixed(1)}万`, higherIsBetter: true },
  { key: 'env', label: '环境系数', getValue: (r: CompareItem['result']) => r.envFactor, format: (v: number) => v.toFixed(3), higherIsBetter: true },
  { key: 'hours', label: '工时友好', getValue: (r: CompareItem['result']) => r.effectiveHours, format: (v: number) => `${v.toFixed(1)}h`, higherIsBetter: false },
  { key: 'city', label: '城市因子', getValue: (r: CompareItem['result']) => r.cityFactor, format: (v: number) => v.toFixed(2), higherIsBetter: true },
  { key: 'industry', label: '行业因子', getValue: (r: CompareItem['result']) => r.industryFactor, format: (v: number) => v.toFixed(2), higherIsBetter: true },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface HoveredTip {
  dimIdx: number;
  itemIdx: number;
  x: number;
  y: number;
}

export function RadarChart({ items }: Props) {
  if (items.length === 0) return null;

  const [hoveredTip, setHoveredTip] = useState<HoveredTip | null>(null);

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
  const rawValues: (number | null)[][] = []; // [dimIdx][itemIdx]
  RADAR_DIMS.forEach((dim) => {
    const vals = items.map((it) => dim.getValue(it.result));
    rawValues.push(vals);
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

          {/* Polygon 填充层（不拦截鼠标） */}
          {items.map((item, itemIdx) => {
            const color = COLORS[itemIdx % COLORS.length];
            return (
              <path key={item.id} d={itemPath(itemIdx)} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} pointerEvents="none" />
            );
          })}

          {/* Circle 层（最上层，接收悬停） */}
          {items.map((item, itemIdx) => {
            const color = COLORS[itemIdx % COLORS.length];
            return Array.from({ length: n }, (_, dimIdx) => {
              const p = polar(getAngle(dimIdx), R * normalized[dimIdx][itemIdx]);
              return (
                <circle
                  key={`${item.id}-${dimIdx}`}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                  className="cursor-pointer"
                  onPointerEnter={() => setHoveredTip({ dimIdx, itemIdx, x: p.x, y: p.y })}
                  onPointerLeave={() => setHoveredTip(null)}
                />
              );
            });
          })}

          {/* Tooltip */}
          {hoveredTip && (() => {
            const { dimIdx, itemIdx, x, y } = hoveredTip;
            const dim = RADAR_DIMS[dimIdx];
            const item = items[itemIdx];
            const rawVal = rawValues[dimIdx][itemIdx];
            const text = `${item.label}: ${rawVal !== null ? dim.format(rawVal) : '-'}`;
            const tw = text.length * 8 + 16;
            const th = 28;
            // Position: prefer above-right, adjust if near edge
            let tx = x + 8;
            let ty = y - th - 4;
            if (tx + tw > size - 4) tx = x - tw - 8;
            if (ty < 4) ty = y + 12;
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={tw} height={th} rx={6} fill="rgba(0,0,0,0.8)" />
                <text x={tx + tw / 2} y={ty + th / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={11} fontWeight={500}>
                  {text}
                </text>
              </g>
            );
          })()}

          {/* Labels — pointer-events-none 防止挡住数据点的悬停 */}
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
                pointerEvents="none"
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

      {/* ── 计算过程 ── */}
      <div className="border-t border-gray-100">
        <div className="px-5 py-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">计算过程</span>
          <span className="text-xs text-gray-400">点击展开查看各 offer 评分详情</span>
        </div>
        <div className="px-5 pb-4 space-y-3">
          {items.map((item, idx) => (
            <CalcDetail key={item.id} item={item} color={COLORS[idx % COLORS.length]} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 可展开的计算节点 */
function CalcNode({
  label,
  value,
  children,
  borderColor = 'border-gray-200',
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  borderColor?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pl-2 border-l-2 ${borderColor} ml-1`}>
      <button
        type="button"
        onClick={() => children && setOpen(!open)}
        className={`w-full py-1.5 flex items-center justify-between text-left rounded transition-colors px-2 ${children ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
      >
        <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
          {children && (
            <span className={`text-[10px] text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
          )}
          {label}
        </span>
        <span className="text-sm font-mono text-gray-700">{value}</span>
      </button>
      {children && open && <div className="pb-1">{children}</div>}
    </div>
  );
}

/** 叶子节点 */
function CalcLeaf({ label, value, formula }: { label: string; value?: string; formula?: string }) {
  return (
    <div className="text-[11px] text-gray-500 py-0.5 px-2 ml-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0">{label}</span>
        {value && <span className="font-mono text-gray-600 shrink-0">{value}</span>}
      </div>
      {formula && <div className="font-mono text-gray-400 break-all mt-0.5">{formula}</div>}
    </div>
  );
}

/** 单个 offer 的计算过程卡片 */
function CalcDetail({ item, color }: { item: CompareItem; color: string }) {
  const [open, setOpen] = useState(false);
  const r = item.result;
  const inp = item.input;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-800">{item.label}</span>
          <span className={`text-sm font-bold ${r.rating.color}`}>{r.score.toFixed(2)}</span>
          <span className={`text-xs font-medium ${r.rating.color}`}>{r.rating.label}</span>
        </div>
        <span className={`text-xs text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>

      {open && (
        <div className="px-4 pb-3 text-xs text-gray-600 border-t border-gray-50 pt-3">
          {/* 核心公式 */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-[11px] text-center">
            <span className="text-gray-500">Score = </span>
            <span className="text-gray-800">(日薪 × 环境系数)</span>
            <span className="text-gray-500"> / </span>
            <span className="text-gray-800">(期望日薪 × timeFactor)</span>
          </div>

          {/* 分子：日薪 × 环境系数 */}
          <CalcNode label="日薪 × 环境系数" value={`${r.dailySalary.toFixed(0)} × ${r.envFactor.toFixed(2)} = ${(r.dailySalary * r.envFactor).toFixed(0)}`} borderColor="border-blue-200">
            <CalcNode label="日薪" value={`¥${r.dailySalary.toFixed(0)}`}>
              <CalcLeaf label="年总包 TC" formula={`${inp.monthlyBaseSalary} × ${inp.monthsPerYear} + ${inp.yearEndBonus.toLocaleString()} + ${inp.annualStock}万 + ${inp.monthlyAllowance}×12`} value={`${(r.totalCompensation / 10000).toFixed(1)}万`} />
              <CalcNode label="年工作日" value={`${r.workingDays.toFixed(1)} 天`}>
                <CalcLeaf label="周数 × 工作天数" formula={`52 × ${inp.workDaysPerWeek}`} value={`= ${(52 * inp.workDaysPerWeek).toFixed(0)}`} />
                <CalcLeaf label="− 年假" value={`${inp.annualLeave} 天`} />
                <CalcLeaf label="− 法定假日" value={`${inp.publicHolidays} 天`} />
                <CalcLeaf label="− 带薪病假 × 0.6" formula={`${inp.paidSickLeave} × 0.6`} value={`${(inp.paidSickLeave * 0.6).toFixed(1)} 天`} />
              </CalcNode>
              <CalcLeaf label="日薪" formula={`${r.totalCompensation.toLocaleString()} / ${r.workingDays.toFixed(1)}`} value={`¥${r.dailySalary.toFixed(0)}`} />
            </CalcNode>
            <CalcNode label="环境系数" value={r.envFactor.toFixed(4)}>
              <CalcLeaf label="办公环境" value={`×${r.envFactors.workEnv.toFixed(2)}`} />
              <CalcLeaf label="食堂系数" value={`×${r.envFactors.cafeteria.toFixed(2)}`} />
              <CalcLeaf label="城市储蓄系数" value={`×${r.envFactors.citySavings.toFixed(4)}`} />
              <CalcLeaf label="定居系数" value={`×${r.envFactors.settlement.toFixed(2)}`} />
              <CalcLeaf label="地点偏好" value={`×${r.envFactors.locationPref.toFixed(2)}`} />
              <CalcLeaf label="劳动保障系数" value={`×${r.envFactors.laborFactor.toFixed(2)}`} />
              <CalcNode label="平台系数" value={`×${r.envFactors.platformFactor.toFixed(4)}`}>
                <CalcLeaf label="发展空间" value={`×${r.envFactors.growthFactor.toFixed(2)}`} />
                <CalcLeaf label="岗位核心" value={`×${r.envFactors.roleCoreFactor.toFixed(2)}`} />
                <CalcLeaf label="公司规模" value={`×${r.envFactors.companySizeFactor.toFixed(2)}`} />
                <CalcLeaf label="加班文化" value={`÷${r.envFactors.overtimeCultureFactor.toFixed(2)}`} />
              </CalcNode>
            </CalcNode>
          </CalcNode>

          {/* 分母：期望日薪 × timeFactor */}
          <CalcNode label="期望日薪 × timeFactor" value={`${r.expectedDailySalary.toFixed(0)} × ${r.timeFactor.toFixed(2)} = ${(r.expectedDailySalary * r.timeFactor).toFixed(0)}`} borderColor="border-orange-200">
            <CalcNode label="期望日薪" value={`¥${r.expectedDailySalary.toFixed(0)}`}>
              <CalcNode label="学历分值" value={r.educationScore.toFixed(2)}>
                <CalcLeaf label="本科" value={inp.bachelorLevel} />
                <CalcLeaf label="硕士" value={inp.masterLevel} />
                <CalcLeaf label="博士" value={inp.phdLevel} />
              </CalcNode>
              <CalcLeaf label="行业因子" value={`×${r.industryFactor.toFixed(2)}`} />
              <CalcLeaf label="城市因子" value={`×${r.cityFactor.toFixed(2)}`} />
              <CalcLeaf label="期望年薪" formula={`${r.educationScore.toFixed(2)} × ${r.industryFactor.toFixed(2)} × ${r.cityFactor.toFixed(2)}`} value={`${(r.expectedAnnualSalary / 10000).toFixed(1)}万`} />
              <CalcLeaf label="期望日薪" formula={`${r.expectedAnnualSalary.toLocaleString()} / 260`} value={`¥${r.expectedDailySalary.toFixed(0)}`} />
            </CalcNode>
            <CalcNode label="timeFactor" value={r.timeFactor.toFixed(2)}>
              <CalcNode label="有效工时" value={`${r.effectiveHours.toFixed(2)} h`}>
                <CalcLeaf label="日均工时" value={`${inp.dailyWorkHours} h`} />
                <CalcLeaf label="− 0.5 × 休息时间" formula={`0.5 × ${inp.restHours}`} />
                <CalcLeaf label="+ 通勤（仅办公室日）" formula={`${inp.commuteHours}h × ${r.shuttleFactor} × ${(r.officeRatio * 100).toFixed(0)}%`} />
              </CalcNode>
              <CalcNode label="办公室比例" value={`${(r.officeRatio * 100).toFixed(0)}%`}>
                <CalcLeaf label="每周工作" value={`${inp.workDaysPerWeek} 天`} />
                <CalcLeaf label="WFH" value={`${inp.wfhDaysPerWeek} 天`} />
              </CalcNode>
              <CalcLeaf label="班车系数" value={r.shuttleFactor.toFixed(1)} />
              <CalcLeaf label="timeFactor" formula={`${r.effectiveHours.toFixed(2)} / 8`} value={r.timeFactor.toFixed(2)} />
            </CalcNode>
          </CalcNode>

          {/* 最终得分 */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-[11px] text-center mt-1">
            <span className="text-gray-500">= (¥{r.dailySalary.toFixed(0)} × {r.envFactor.toFixed(4)}) / (¥{r.expectedDailySalary.toFixed(0)} × {r.timeFactor.toFixed(2)}) </span>
            <span className={`font-bold ${r.rating.color}`}>= {r.score.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

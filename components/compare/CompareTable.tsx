'use client';

import type { CompareItem } from '@/lib/types';

interface Props {
  items: CompareItem[];
}

/** 数值格式化 */
function fmtWan(n: number): string {
  return `${(n / 10000).toFixed(1)}万`;
}
function fmtYuan(n: number): string {
  return `¥${n.toFixed(0)}`;
}

/** 对比维度定义 */
interface DimDef {
  key: string;
  label: string;
  getValue: (r: CompareItem['result']) => number | null;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const DIMENSIONS: DimDef[] = [
  { key: 'score', label: '总评分', getValue: (r) => r.score, format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'tc', label: '年总包 TC', getValue: (r) => r.totalCompensation, format: fmtWan, higherIsBetter: true },
  { key: 'dailySalary', label: '日薪', getValue: (r) => r.dailySalary, format: fmtYuan, higherIsBetter: true },
  { key: 'envFactor', label: '环境系数', getValue: (r) => r.envFactor, format: (v) => v.toFixed(3), higherIsBetter: true },
  { key: 'effectiveHours', label: '有效工时', getValue: (r) => r.effectiveHours, format: (v) => `${v.toFixed(1)}h`, higherIsBetter: false },
  { key: 'expectedDaily', label: '期望日薪', getValue: (r) => r.expectedDailySalary, format: fmtYuan, higherIsBetter: true },
  { key: 'cityFactor', label: '城市因子', getValue: (r) => r.cityFactor, format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'industryFactor', label: '行业因子', getValue: (r) => r.industryFactor, format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'workingDays', label: '年工作日', getValue: (r) => r.workingDays, format: (v) => `${v.toFixed(0)}天`, higherIsBetter: false },
];

export function CompareTable({ items }: Props) {
  const itemsWithResult = items.filter((it) => it.result !== null);
  if (itemsWithResult.length === 0) return null;

  /** 找出某个维度的赢家索引 */
  const getWinnerIdx = (dim: DimDef): number => {
    let bestIdx = -1;
    let bestVal: number | null = null;
    itemsWithResult.forEach((it, i) => {
      const v = dim.getValue(it.result);
      if (v === null) return;
      if (bestVal === null) { bestVal = v; bestIdx = i; return; }
      if (dim.higherIsBetter ? v > bestVal : v < bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  // 预计算每个维度的赢家
  const winners = new Map<string, number>();
  DIMENSIONS.forEach((dim) => {
    winners.set(dim.key, getWinnerIdx(dim));
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">维度对比</h3>
        <p className="text-xs text-gray-400 mt-0.5">绿色高亮 = 该维度最优</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-32 sticky left-0 bg-white z-[1]">
                维度
              </th>
              {itemsWithResult.map((it) => (
                <th key={it.id} className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 min-w-[120px]">
                  {it.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 评级行 */}
            <tr className="border-b border-gray-50">
              <td className="px-4 py-2.5 text-sm font-medium text-gray-600 sticky left-0 bg-white z-[1]">评级</td>
              {itemsWithResult.map((it) => (
                <td key={it.id} className="px-4 py-2.5 text-sm">
                  <span className={`font-semibold ${it.result.rating.color}`}>
                    {it.result.rating.label}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    {it.result.rating.description}
                  </span>
                </td>
              ))}
            </tr>

            {/* 数值维度行 */}
            {DIMENSIONS.map((dim) => {
              const winIdx = winners.get(dim.key) ?? -1;
              return (
                <tr key={dim.key} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-600 sticky left-0 bg-white z-[1]">
                    {dim.label}
                  </td>
                  {itemsWithResult.map((it, idx) => {
                    const val = dim.getValue(it.result);
                    const isWinner = idx === winIdx && itemsWithResult.length > 1;
                    return (
                      <td
                        key={it.id}
                        className={`px-4 py-2.5 text-sm font-mono transition-colors ${
                          isWinner ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        {val !== null ? dim.format(val) : '-'}
                        {dim.key === 'score' && val !== null && (
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isWinner ? 'bg-green-500' : 'bg-blue-400'}`}
                              style={{ width: `${Math.min(val * 50, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

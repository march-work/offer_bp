'use client';

import type { FreshGradResult } from '@/lib/types';

interface Props {
  result: FreshGradResult | null;
}

export function FreshGradResult({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          输入薪资后实时评测
        </h3>
        <p className="text-sm text-gray-400">
          填写左侧表单，输入年薪后即可看到评测结果
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 核心分数 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className={`text-5xl font-bold ${result.rating.color} mb-1`}>
          {result.score.toFixed(2)}
        </div>
        <div className={`text-xl font-semibold ${result.rating.color} mb-1`}>
          {result.rating.label}
        </div>
        <div className="text-sm text-gray-500">{result.rating.description}</div>
      </div>

      {/* 薪资对比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">薪资对比</h4>
        <div className="grid grid-cols-2 gap-4">
          <MetricBox
            label="你的 TC（年总包）"
            value={`${(result.totalCompensation / 10000).toFixed(1)}万`}
            sub={`日薪 ¥${result.dailySalary.toFixed(0)}`}
          />
          <MetricBox
            label="期望 TC"
            value={`${(result.expectedAnnualSalary / 10000).toFixed(1)}万`}
            sub={`日薪 ¥${result.expectedDailySalary.toFixed(0)}`}
          />
        </div>
        {result.industryAvgSalary > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">行业平均年薪</span>
              <span className="font-mono text-gray-700">
                {(result.industryAvgSalary / 10000).toFixed(1)}万
                <span className="text-xs text-gray-400 ml-1">（官方统计）</span>
              </span>
            </div>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <SalaryBar
            actual={result.dailySalary}
            expected={result.expectedDailySalary}
          />
        </div>
      </div>

      {/* 因子拆解 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">因子拆解</h4>
        <div className="space-y-2 text-sm">
          <FactorRow label="年工作日" value={`${result.workingDays.toFixed(1)} 天`} />
          <FactorRow label="环境系数" value={result.envFactor.toFixed(4)} />
          <FactorRow label="有效工时" value={`${result.effectiveHours.toFixed(2)} h/天`} />
          <FactorRow label="办公室比例" value={`${(result.officeRatio * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* 公式说明 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-400 font-mono leading-relaxed">
          Score = (日薪 × 环境系数 × 8) / (期望日薪 × 有效工时)<br />
          = ({result.dailySalary.toFixed(0)} × {result.envFactor.toFixed(4)} × 8)<br />
          &nbsp;&nbsp;/ ({result.expectedDailySalary.toFixed(0)} × {result.effectiveHours.toFixed(2)})<br />
          = <span className="text-gray-600 font-bold">{result.score.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SalaryBar({ actual, expected }: { actual: number; expected: number }) {
  const ratio = actual / expected;
  const percentage = Math.min(ratio * 100, 200);
  const isAbove = ratio >= 1;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{(ratio * 100).toFixed(0)}% of expected</span>
        <span className={isAbove ? 'text-green-600' : 'text-orange-500'}>
          {isAbove ? '超出期望' : '低于期望'}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAbove ? 'bg-green-500' : 'bg-orange-400'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FactorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-900">{value}</span>
    </div>
  );
}

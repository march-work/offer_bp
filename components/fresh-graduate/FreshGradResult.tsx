'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FreshGradResult, FreshGradInput } from '@/lib/types';
import { useCompareStore } from '@/lib/compare-store';

interface Props {
  result: FreshGradResult | null;
  input?: FreshGradInput;
}

export function FreshGradResult({ result, input }: Props) {
  const { items } = useCompareStore();

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

  // 判断是否已自动保存
  const label = input ? `${input.targetCity}-${input.targetIndustry.slice(0, 4)}` : '';
  const isSaved = items.some((it) => it.label === label);

  return (
    <div className="space-y-4 animate-[slideUp_300ms_ease-out]">
      {/* 核心分数 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 text-center animate-[scaleIn_250ms_ease-out]">
        <div className={`text-4xl sm:text-5xl font-bold ${result.rating.color} mb-1 tabular-nums`}>
          {result.score.toFixed(2)}
        </div>
        <div className={`text-xl font-semibold ${result.rating.color} mb-1`}>
          {result.rating.label}
        </div>
        <div className="text-sm text-gray-500">{result.rating.description}</div>
      </div>

      {/* 对比状态 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center transition-colors ${
            isSaved
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-400 border border-gray-200'
          }`}
        >
          {isSaved ? '已自动保存至对比' : '计算后自动保存'}
        </div>
        {items.length > 0 && (
          <Link
            href="/compare"
            className="py-2 px-3 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            查看对比 ({items.length})
          </Link>
        )}
      </div>

      {/* 薪资对比 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">薪资对比</h4>
        <div className="grid grid-cols-2 gap-4">
          <MetricBox
            label="你的总年包（新人）"
            value={`${(result.totalCompensation / 10000).toFixed(1)}万`}
            sub={`日薪 ¥${(result.totalCompensation / result.workingDays).toFixed(0)}`}
          />
          {result.industryAvgSalary > 0 ? (
            <MetricBox
              label="行业平均年薪"
              value={`${(result.industryAvgSalary / 10000).toFixed(1)}万`}
              sub={`日薪 ¥${(result.industryAvgSalary / 260).toFixed(0)}`}
            />
          ) : (
            <MetricBox
              label="期望 TC"
              value={`${(result.expectedAnnualSalary / 10000).toFixed(1)}万`}
              sub={`日薪 ¥${(result.expectedAnnualSalary / 260).toFixed(0)}`}
            />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <SalaryBar
            actual={result.totalCompensation}
            expected={result.industryAvgSalary > 0 ? result.industryAvgSalary : result.expectedAnnualSalary}
            label={result.industryAvgSalary > 0 ? '行业平均' : '学历期望'}
          />
        </div>
      </div>

      {/* 公式说明 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-4">
          <span className="inline-block w-4 h-px bg-gray-300" />
          <span>计算过程</span>
          <span className="inline-block w-4 h-px bg-gray-300" />
        </div>

        <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
          {/* 分子 */}
          <CalcNode
            label="日薪 × 环境系数"
            value={`${result.dailySalary.toFixed(0)} × ${result.envFactor.toFixed(2)} = ${(result.dailySalary * result.envFactor).toFixed(0)}`}
          >
            <CalcNode
              label="日薪"
              value={`¥${result.dailySalary.toFixed(0)}`}
            >
              <CalcLeaf label="年总包 TC" formula={`${input?.monthlyBaseSalary ?? 0} × ${input?.monthsPerYear ?? 12} + ${(input?.yearEndBonus ?? 0).toLocaleString()} + ${(input?.annualStock ?? 0)}万 + ${(input?.monthlyAllowance ?? 0) * 12}`} value={`${result.totalCompensation.toLocaleString()} 元`} />
              <CalcNode label="年工作日" value={`${result.workingDays.toFixed(1)} 天`}>
                <CalcLeaf label="周数 × 工作天数" formula={`52 × ${input?.workDaysPerWeek ?? 5}`} value={`= ${(52 * (input?.workDaysPerWeek ?? 5)).toFixed(0)}`} />
                <CalcLeaf label="− 年假" value={`${input?.annualLeave ?? 0} 天`} />
                <CalcLeaf label="− 法定假日" value={`${input?.publicHolidays ?? 0} 天`} />
                <CalcLeaf label="− 带薪病假 × 0.6" formula={`${input?.paidSickLeave ?? 0} × 0.6`} value={`${((input?.paidSickLeave ?? 0) * 0.6).toFixed(1)} 天`} />
              </CalcNode>
              <CalcLeaf label="日薪" formula={`${result.totalCompensation.toLocaleString()} / ${result.workingDays.toFixed(1)}`} value={`¥${result.dailySalary.toFixed(0)}`} />
            </CalcNode>
            <CalcNode
              label="环境系数"
              value={result.envFactor.toFixed(4)}
            >
              <CalcLeaf label="办公环境" value={`×${result.envFactors.workEnv.toFixed(2)}`} />
              <CalcLeaf label="食堂系数" value={`×${result.envFactors.cafeteria.toFixed(2)}`} />
              <CalcNode label="城市储蓄系数" value={`×${result.envFactors.citySavings.toFixed(4)}`}>
                <CalcLeaf label="城市人均收入" value={`¥${result.envFactors.cityIncome.toLocaleString()}`} />
                <CalcLeaf label="城市人均支出 × 0.7" formula={`${result.envFactors.cityConsumption.toLocaleString()} × 0.7`} value={`¥${(result.envFactors.cityConsumption * 0.7).toLocaleString()}`} />
                <CalcLeaf label="年居住成本" value={`¥${result.envFactors.annualHousingCost.toLocaleString()}`} />
                <CalcLeaf label="储蓄率" formula={`(${result.envFactors.cityIncome.toLocaleString()} − ${(result.envFactors.cityConsumption * 0.7).toLocaleString()} − ${result.envFactors.annualHousingCost.toLocaleString()}) / ${result.envFactors.cityIncome.toLocaleString()}`} value={`${(result.envFactors.savingsRate * 100).toFixed(1)}%`} />
              </CalcNode>
              <CalcNode label="定居系数" value={`×${result.envFactors.settlement.toFixed(2)}`}>
                <CalcLeaf label="10 年收入" value={`¥${(result.totalCompensation * 10).toLocaleString()}`} />
                <CalcLeaf label="新房 90㎡ 首付 (30%)" value={`¥${result.envFactors.newhomeDownPayment.toLocaleString()}`} />
                <CalcLeaf label="定居系数" formula={`min(${(result.totalCompensation * 10).toLocaleString()} / ${result.envFactors.newhomeDownPayment.toLocaleString()}, 3)`} value={result.envFactors.settlement.toFixed(2)} />
              </CalcNode>
              <CalcLeaf label="地点偏好" value={`×${result.envFactors.locationPref.toFixed(2)}`} />
              <CalcNode label="劳动保障系数" value={`×${result.envFactors.laborFactor.toFixed(2)}`}>
                <CalcLeaf label="五险系数" value={`×${result.envFactors.socialInsuranceFactor.toFixed(2)}`} />
                <CalcLeaf label="公积金系数" value={`×${result.envFactors.housingFundFactor.toFixed(2)}`} />
                <CalcLeaf label="六险二金系数" value={`×${result.envFactors.extraInsuranceFactor.toFixed(1)}`} />
              </CalcNode>
              <CalcNode label="平台系数" value={`×${result.envFactors.platformFactor.toFixed(4)}`}>
                <CalcLeaf label="个人发展空间" value={`×${result.envFactors.growthFactor.toFixed(2)}`} />
                <CalcLeaf label="岗位核心程度" value={`×${result.envFactors.roleCoreFactor.toFixed(2)}`} />
                <CalcLeaf label="公司规模" value={`×${result.envFactors.companySizeFactor.toFixed(2)}`} />
                <CalcLeaf label="加班文化" value={`÷${result.envFactors.overtimeCultureFactor.toFixed(2)}`} />
              </CalcNode>
            </CalcNode>
          </CalcNode>

          {/* 分母 */}
          <CalcNode
            label="期望日薪 × timeFactor"
            value={`${result.expectedDailySalary.toFixed(0)} × ${result.timeFactor.toFixed(2)} = ${(result.expectedDailySalary * result.timeFactor).toFixed(0)}`}
          >
            <CalcNode
              label="期望日薪"
              value={`¥${result.expectedDailySalary.toFixed(0)}`}
            >
              <CalcNode label="学历分值" value={result.educationScore.toFixed(2)}>
                <CalcLeaf label="本科" value={input?.bachelorLevel ?? '-'} />
                <CalcLeaf label="硕士" value={input?.masterLevel ?? '-'} />
                <CalcLeaf label="博士" value={input?.phdLevel ?? '-'} />
              </CalcNode>
              <CalcLeaf label="行业因子" value={result.industryFactor.toFixed(2)} />
              <CalcLeaf label="城市因子" value={`×${result.cityFactor.toFixed(2)}`} />
              <CalcLeaf label="期望年薪" formula={`${result.educationScore.toFixed(2)} × ${result.industryFactor.toFixed(2)} × ${result.cityFactor.toFixed(2)}`} value={`${(result.expectedAnnualSalary / 10000).toFixed(1)}万`} />
              <CalcLeaf label="期望日薪" formula={`${(result.expectedAnnualSalary).toLocaleString()} / 260`} value={`¥${result.expectedDailySalary.toFixed(0)}`} />
            </CalcNode>
            <CalcNode
              label="timeFactor"
              value={result.timeFactor.toFixed(2)}
            >
              <CalcNode label="有效工时" value={`${result.effectiveHours.toFixed(2)} h`}>
                <CalcLeaf label="日均工时" value={`${input?.dailyWorkHours ?? 8} h`} />
                <CalcLeaf label="− 0.5 × 休息时间" formula={`0.5 × ${input?.restHours ?? 0}`} />
                <CalcLeaf label="+ 通勤（仅办公室日）" formula={`${(input?.commuteHours ?? 0) * 60}min × ${result.shuttleFactor} × ${(result.officeRatio * 100).toFixed(0)}%`} />
              </CalcNode>
              <CalcNode label="办公室比例" value={`${(result.officeRatio * 100).toFixed(0)}%`}>
                <CalcLeaf label="每周工作" value={`${input?.workDaysPerWeek ?? 5} 天`} />
                <CalcLeaf label="WFH" value={`${input?.wfhDaysPerWeek ?? 0} 天`} />
                <CalcLeaf label="公式" formula={`(${input?.workDaysPerWeek ?? 5} − ${input?.wfhDaysPerWeek ?? 0}) / ${input?.workDaysPerWeek ?? 5}`} value={`${(result.officeRatio * 100).toFixed(0)}%`} />
              </CalcNode>
              <CalcLeaf label="班车系数" value={result.shuttleFactor.toFixed(1)} />
              <CalcLeaf label="timeFactor" formula={`${result.effectiveHours.toFixed(2)} / 8`} value={result.timeFactor.toFixed(2)} />
            </CalcNode>
          </CalcNode>
        </div>
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

function SalaryBar({ actual, expected, label }: { actual: number; expected: number; label: string }) {
  const ratio = actual / expected;
  const percentage = Math.min(ratio * 100, 200);
  const isAbove = ratio >= 1;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{(ratio * 100).toFixed(0)}% {label}</span>
        <span className={isAbove ? 'text-green-600' : 'text-orange-500'}>
          {isAbove ? '高于平均' : '低于平均'}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
        {/* 100% 基准线 */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400 z-10" />
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAbove ? 'bg-green-500' : 'bg-orange-400'
          }`}
          style={{ width: `${Math.min(percentage / 2, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>0%</span>
        <span>{label}</span>
        <span>200%</span>
      </div>
    </div>
  );
}

/** 可展开的计算节点（支持无限嵌套） */
function CalcNode({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pl-3 border-l-2 border-gray-200 ml-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full py-2 flex items-center justify-between text-left hover:bg-gray-100 rounded transition-colors px-2"
      >
        <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
          <span className={`text-[10px] text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
          {label}
        </span>
        <span className="text-sm font-mono text-gray-700">{value}</span>
      </button>
      {children && (
        <div className={`expand-grid ${!open ? 'expand-closed' : ''}`}>
          <div className="expand-inner">
            <div className="pb-2">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 叶子节点（不可展开，显示公式和值） */
function CalcLeaf({
  label,
  formula,
  value,
}: {
  label: string;
  formula?: string;
  value?: string;
}) {
  return (
    <div className="text-[11px] text-gray-500 py-1 px-2 ml-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0">{label}</span>
        {value && <span className="font-mono text-gray-600 shrink-0">{value}</span>}
      </div>
      {formula && <div className="font-mono text-gray-400 break-all mt-0.5">{formula}</div>}
    </div>
  );
}


'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { FreshGradInput } from '@/lib/types';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import { FreshGradForm } from '@/components/fresh-graduate/FreshGradForm';
import { FreshGradResult } from '@/components/fresh-graduate/FreshGradResult';
import { LivingCostCard } from '@/components/fresh-graduate/LivingCostCard';

const DEFAULT_INPUT: FreshGradInput = {
  bachelorLevel: '双非',
  masterLevel: '无',
  phdLevel: '无',
  targetCity: '成都',
  targetIndustry: '信息传输、软件和信息技术服务专业',
  monthlyBaseSalary: 0,
  monthsPerYear: 12,
  yearEndBonus: 0,
  annualStock: 0,
  monthlyAllowance: 0,
  workDaysPerWeek: 5,
  wfhDaysPerWeek: 0,
  annualLeave: 5,
  publicHolidays: 13,
  paidSickLeave: 0,
  dailyWorkHours: 9,
  commuteHours: 1.5,
  restHours: 1.5,
  workEnvironment: '普通',
  leaderRelation: '中规中矩',
  colleagueRelation: '萍水相逢',
  hasShuttle: false,
  hasCafeteria: false,
  cafeteriaQuality: '普通',
  housingMode: 'shared',
};

export default function FreshGradPage() {
  const [input, setInput] = useState<FreshGradInput>(DEFAULT_INPUT);
  const [calculatedInput, setCalculatedInput] = useState<FreshGradInput | null>(null);

  const handleInputChange = useCallback(
    (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => {
      setInput((prev) => {
        const next = { ...prev, [field]: value };
        // WFH 不能超过工作天数
        if (field === 'wfhDaysPerWeek' && (value as number) > next.workDaysPerWeek) {
          next.wfhDaysPerWeek = next.workDaysPerWeek;
        }
        return next;
      });
    },
    [],
  );

  const handleCalculate = useCallback(() => {
    const tc = calculateTotalCompensation(input);
    if (tc <= 0) {
      alert('请先填写月薪（月薪需大于 0）');
      return;
    }
    setCalculatedInput({ ...input });
  }, [input]);

  const result = useMemo(() => {
    if (!calculatedInput) return null;
    const tc = calculateTotalCompensation(calculatedInput);
    if (tc <= 0) return null;
    return calculateFreshGradScore(calculatedInput);
  }, [calculatedInput]);

  const tc = useMemo(() => {
    if (!calculatedInput) return 0;
    return calculateTotalCompensation(calculatedInput);
  }, [calculatedInput]);

  const shareUrl = useMemo(() => {
    const src = calculatedInput ?? input;
    const params = new URLSearchParams();
    params.set('ba', src.bachelorLevel);
    params.set('ma', src.masterLevel);
    params.set('ph', src.phdLevel);
    params.set('city', src.targetCity);
    params.set('ind', src.targetIndustry);
    params.set('mb', String(src.monthlyBaseSalary));
    params.set('mp', String(src.monthsPerYear));
    params.set('yb', String(src.yearEndBonus));
    params.set('st', String(src.annualStock));
    params.set('alw', String(src.monthlyAllowance));
    params.set('wd', String(src.workDaysPerWeek));
    params.set('wfh', String(src.wfhDaysPerWeek));
    params.set('al', String(src.annualLeave));
    params.set('phd', String(src.publicHolidays));
    params.set('ps', String(src.paidSickLeave));
    params.set('wh', String(src.dailyWorkHours));
    params.set('cm', String(src.commuteHours));
    params.set('rh', String(src.restHours));
    params.set('we', src.workEnvironment);
    params.set('lr', src.leaderRelation);
    params.set('cr', src.colleagueRelation);
    params.set('sh', String(src.hasShuttle ? 1 : 0));
    params.set('cf', String(src.hasCafeteria ? 1 : 0));
    params.set('cq', src.cafeteriaQuality ?? '普通');
    params.set('hm', src.housingMode);
    return `/fresh-graduate/share?${params.toString()}`;
  }, [calculatedInput, input]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">
              ← 首页
            </Link>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              应届生 Offer 评测
            </h1>
          </div>
          {result && (
            <Link
              href={shareUrl}
              target="_blank"
              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              完整报告
            </Link>
          )}
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-6xl mx-auto px-4 py-4 pb-24 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* 左栏: 表单 */}
          <div className="lg:col-span-3">
            <FreshGradForm input={input} onChange={handleInputChange} onCalculate={handleCalculate} />
          </div>
          {/* 右栏: 结果 */}
          <div className="lg:col-span-2">
            <div className="sticky top-16 space-y-4">
              <FreshGradResult result={result} />
              <LivingCostCard cityName={calculatedInput?.targetCity ?? input.targetCity} annualSalary={tc} value={input.housingMode} onChange={(mode) => handleInputChange('housingMode', mode)} />
            </div>
          </div>
        </div>
      </main>

      {/* 移动端底部固定栏：未计算时显示按钮，已计算时显示分数 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        {result ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${result.rating.color}`}>
                {result.score.toFixed(2)}
              </span>
              <span className={`text-sm font-semibold ${result.rating.color}`}>
                {result.rating.label}
              </span>
            </div>
            <Link
              href={shareUrl}
              target="_blank"
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg"
            >
              完整报告
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full py-3 bg-blue-600 text-white text-base font-semibold rounded-xl active:bg-blue-800 transition-colors"
          >
            开始评测
          </button>
        )}
      </div>
    </div>
  );
}

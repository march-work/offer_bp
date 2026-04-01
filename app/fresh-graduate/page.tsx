'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { FreshGradInput } from '@/lib/types';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import { FreshGradForm } from '@/components/fresh-graduate/FreshGradForm';
import { FreshGradResult } from '@/components/fresh-graduate/FreshGradResult';
import { LivingCostCard } from '@/components/fresh-graduate/LivingCostCard';
import {
  SCHOOL_OPTIONS,
  EDUCATION_OPTIONS,
  CITY_TIER_OPTIONS,
  INDUSTRY_OPTIONS,
} from '@/lib/constants';

const DEFAULT_INPUT: FreshGradInput = {
  education: '本科',
  schoolLevel: '双非一本',
  targetCity: '新一线',
  targetIndustry: '互联网/软件',
  monthlyBaseSalary: 0,
  bonusMonths: 0,
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
  cityLevel: '新一线',
  hasShuttle: false,
  hasCafeteria: false,
  cafeteriaQuality: '普通',
};

export default function FreshGradPage() {
  const [input, setInput] = useState<FreshGradInput>(DEFAULT_INPUT);

  const handleInputChange = useCallback(
    (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => {
      setInput((prev) => {
        const next = { ...prev, [field]: value };

        // 学历变化时联动学校等级
        if (field === 'education') {
          const options = SCHOOL_OPTIONS[value as string] ?? ['无'];
          if (!options.includes(next.schoolLevel)) {
            next.schoolLevel = options[0];
          }
        }

        // WFH 不能超过工作天数
        if (field === 'wfhDaysPerWeek' && (value as number) > next.workDaysPerWeek) {
          next.wfhDaysPerWeek = next.workDaysPerWeek;
        }

        return next;
      });
    },
    [],
  );

  const result = useMemo(() => {
    const tc = calculateTotalCompensation(input);
    if (tc <= 0) return null;
    return calculateFreshGradScore(input);
  }, [input]);

  const tc = useMemo(() => calculateTotalCompensation(input), [input]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('edu', input.education);
    params.set('sch', input.schoolLevel);
    params.set('city', input.targetCity);
    params.set('ind', input.targetIndustry);
    params.set('mb', String(input.monthlyBaseSalary));
    params.set('bm', String(input.bonusMonths));
    params.set('st', String(input.annualStock));
    params.set('ma', String(input.monthlyAllowance));
    params.set('wd', String(input.workDaysPerWeek));
    params.set('wfh', String(input.wfhDaysPerWeek));
    params.set('al', String(input.annualLeave));
    params.set('ph', String(input.publicHolidays));
    params.set('ps', String(input.paidSickLeave));
    params.set('wh', String(input.dailyWorkHours));
    params.set('cm', String(input.commuteHours));
    params.set('rh', String(input.restHours));
    params.set('we', input.workEnvironment);
    params.set('lr', input.leaderRelation);
    params.set('cr', input.colleagueRelation);
    params.set('cl', input.cityLevel);
    params.set('sh', String(input.hasShuttle ? 1 : 0));
    params.set('cf', String(input.hasCafeteria ? 1 : 0));
    params.set('cq', input.cafeteriaQuality ?? '普通');
    return `/fresh-graduate/share?${params.toString()}`;
  }, [input]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 首页
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">
              应届生 Offer 评测
            </h1>
          </div>
          {result && (
            <Link
              href={shareUrl}
              target="_blank"
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              查看完整报告
            </Link>
          )}
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左栏: 表单 */}
          <div className="lg:col-span-3">
            <FreshGradForm input={input} onChange={handleInputChange} />
          </div>

          {/* 右栏: 结果 */}
          <div className="lg:col-span-2">
            <div className="sticky top-16 space-y-4">
              <FreshGradResult result={result} />
              <LivingCostCard cityTier={input.cityLevel} annualSalary={tc} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

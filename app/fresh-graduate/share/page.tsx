'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useRef, useCallback, useState } from 'react';
import type { FreshGradInput } from '@/lib/types';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import { FreshGradShareCard } from '@/components/fresh-graduate/FreshGradShareCard';

function ShareContent() {
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const input = useMemo<FreshGradInput>(() => ({
    education: (searchParams.get('edu') ?? '本科') as FreshGradInput['education'],
    schoolLevel: searchParams.get('sch') ?? '双非一本',
    targetCity: (searchParams.get('city') ?? '新一线') as FreshGradInput['targetCity'],
    targetIndustry: (searchParams.get('ind') ?? '互联网/软件') as FreshGradInput['targetIndustry'],
    monthlyBaseSalary: Number(searchParams.get('mb') ?? 0),
    bonusMonths: Number(searchParams.get('bm') ?? 0),
    annualStock: Number(searchParams.get('st') ?? 0),
    monthlyAllowance: Number(searchParams.get('ma') ?? 0),
    workDaysPerWeek: Number(searchParams.get('wd') ?? 5),
    wfhDaysPerWeek: Number(searchParams.get('wfh') ?? 0),
    annualLeave: Number(searchParams.get('al') ?? 5),
    publicHolidays: Number(searchParams.get('ph') ?? 13),
    paidSickLeave: Number(searchParams.get('ps') ?? 0),
    dailyWorkHours: Number(searchParams.get('wh') ?? 9),
    commuteHours: Number(searchParams.get('cm') ?? 1.5),
    restHours: Number(searchParams.get('rh') ?? 1.5),
    workEnvironment: searchParams.get('we') ?? '普通',
    leaderRelation: searchParams.get('lr') ?? '中规中矩',
    colleagueRelation: searchParams.get('cr') ?? '萍水相逢',
    cityLevel: (searchParams.get('cl') ?? '新一线') as FreshGradInput['cityLevel'],
    hasShuttle: searchParams.get('sh') === '1',
    hasCafeteria: searchParams.get('cf') === '1',
    cafeteriaQuality: searchParams.get('cq') ?? '普通',
  }), [searchParams]);

  const result = useMemo(() => calculateFreshGradScore(input), [input]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `offer-bp-${result.rating.label}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('截图失败:', err);
    } finally {
      setDownloading(false);
    }
  }, [result.rating.label]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-lg mx-auto px-4">
        <div ref={cardRef}>
          <FreshGradShareCard input={input} result={result} />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? '生成中...' : '保存为图片'}
          </button>
          <a
            href="/fresh-graduate"
            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl
                       font-medium text-center hover:bg-gray-50 transition-colors"
          >
            我也测一下
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Offer BP — 这 offer 接不接？ | 数据仅供参考
        </p>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}

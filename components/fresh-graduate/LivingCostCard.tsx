'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CITY_TIER_CITIES,
  calculateLivingCost,
  type LivingCostResult,
} from '@/lib/living-cost';
import type { CityTier } from '@/lib/types';

interface Props {
  cityTier: CityTier;
  annualSalary: number;
}

function getRentBarColor(ratio: number): string {
  if (ratio < 0.25) return 'bg-green-500';
  if (ratio < 0.35) return 'bg-blue-500';
  if (ratio < 0.50) return 'bg-orange-400';
  return 'bg-red-500';
}

function getBuyBarColor(ratio: number): string {
  if (ratio < 6) return 'bg-green-500';
  if (ratio < 10) return 'bg-blue-500';
  if (ratio < 15) return 'bg-orange-400';
  return 'bg-red-500';
}

export function LivingCostCard({ cityTier, annualSalary }: Props) {
  const cities = CITY_TIER_CITIES[cityTier] ?? [];
  const [selectedCity, setSelectedCity] = useState(cities[0] ?? '');

  // 当 tier 变化时重置选中城市
  useEffect(() => {
    setSelectedCity(cities[0] ?? '');
  }, [cityTier, cities]);

  const result = useMemo(
    () => calculateLivingCost(selectedCity, annualSalary),
    [selectedCity, annualSalary],
  );

  if (annualSalary <= 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-3">🏠</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">生活成本分析</h3>
        <p className="text-sm text-gray-400">输入薪资后查看居住成本分析</p>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">生活成本分析</h4>
        <p className="text-xs text-gray-400">
          暂无「{cityTier}」城市的生活成本数据，目前支持：北京、上海、深圳、广州、杭州、南京、成都、武汉、西安、合肥、青岛
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">生活成本分析</h4>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {result && <LivingCostDetails result={result} />}
    </div>
  );
}

function LivingCostDetails({ result }: { result: LivingCostResult }) {
  return (
    <div className="space-y-4">
      {/* 收入对比 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">城市人均收入</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{result.cityAvgIncome.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">/年（2024 年数据）</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">收入排名估计</div>
          <div className="text-lg font-semibold text-blue-600">
            前 {result.userIncomePercentile}%
          </div>
          <div className="text-xs text-gray-400">在该城市居民中</div>
        </div>
      </div>

      {/* 租房指标 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">租房成本</span>
          <span className={`text-xs font-semibold ${
            result.wholeRentIncomeRatio < 0.35 ? 'text-green-600' :
            result.wholeRentIncomeRatio < 0.50 ? 'text-orange-500' : 'text-red-500'
          }`}>
            {result.rentRating}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">整租 60㎡</span>
            <span className="font-mono text-gray-900">¥{result.wholeRentMonthly.toLocaleString()}/月</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">合租 20㎡</span>
            <span className="font-mono text-gray-900">¥{result.sharedRentMonthly.toLocaleString()}/月</span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>整租收入比 {(result.wholeRentIncomeRatio * 100).toFixed(0)}%</span>
              <span>合理线 30%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getRentBarColor(result.wholeRentIncomeRatio)}`}
                style={{ width: `${Math.min(result.wholeRentIncomeRatio / 0.5 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 买房指标 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">买房成本（90㎡ 二手）</span>
          <span className={`text-xs font-semibold ${
            result.priceIncomeRatio < 10 ? 'text-green-600' :
            result.priceIncomeRatio < 15 ? 'text-orange-500' : 'text-red-500'
          }`}>
            {result.buyRating}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">房屋总价</span>
            <span className="font-mono text-gray-900">{result.totalPrice} 万</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">总价收入比</span>
            <span className="font-mono text-gray-900">{result.priceIncomeRatio.toFixed(1)} 年</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">首付（30%）</span>
            <span className="font-mono text-gray-900">{(result.totalPrice * 0.3).toFixed(0)} 万 ≈ {result.downPaymentYears.toFixed(1)} 年收入</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">月供（30年/LPR 3.1%）</span>
            <span className="font-mono text-gray-900">¥{result.monthlyPayment.toLocaleString()}/月</span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>月供收入比 {(result.mortgageIncomeRatio * 100).toFixed(0)}%</span>
              <span>警戒线 50%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBuyBarColor(result.priceIncomeRatio)}`}
                style={{ width: `${Math.min(result.mortgageIncomeRatio / 0.7 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 综合居住压力 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">综合居住压力指数</span>
          <span className={`text-sm font-bold ${result.pressureColor}`}>
            {result.pressureRating}（{result.livingPressureIndex.toFixed(2)}）
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              result.livingPressureIndex < 0.5 ? 'bg-green-500' :
              result.livingPressureIndex < 0.8 ? 'bg-blue-500' :
              result.livingPressureIndex < 1.2 ? 'bg-orange-400' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(result.livingPressureIndex / 1.5 * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>轻松</span>
          <span>合理</span>
          <span>偏高</span>
          <span>沉重</span>
        </div>
      </div>

      {/* 数据来源 */}
      <p className="text-[10px] text-gray-400 text-center">
        房价数据：creprice.cn 2026-03 | 收入数据：国家统计局 2024
      </p>
    </div>
  );
}

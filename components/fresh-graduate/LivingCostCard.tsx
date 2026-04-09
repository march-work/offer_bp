'use client';

import { useMemo, useState } from 'react';
import {
  calculateLivingCost,
  type BuyMode,
  type RentMode,
  type LivingMode,
  type BuyResult,
  type RentResult,
} from '@/lib/living-cost';

interface Props {
  cityName: string;
  annualSalary: number;
  value: 'newhome' | 'secondhand' | 'whole' | 'shared';
  onChange: (mode: 'newhome' | 'secondhand' | 'whole' | 'shared') => void;
  housingData?: { secondhandPrice: number; newhomePrice: number; wholeRentPrice: number; sharedRentPrice: number };
  incomeData?: { income: number; consumption: number };
}

function getRentBarColor(ratio: number): string {
  if (ratio < 0.25) return 'bg-green-500';
  if (ratio < 0.35) return 'bg-blue-500';
  if (ratio < 0.50) return 'bg-orange-400';
  return 'bg-red-500';
}

function getBuyBarColor(years: number): string {
  if (years < 6) return 'bg-green-500';
  if (years < 10) return 'bg-blue-500';
  if (years < 15) return 'bg-orange-400';
  return 'bg-red-500';
}

type LivingSubMode = BuyMode | RentMode;

const SUB_OPTIONS: { value: LivingSubMode; label: string }[] = [
  { value: 'newhome', label: '新房' },
  { value: 'secondhand', label: '二手房' },
  { value: 'whole', label: '整租' },
  { value: 'shared', label: '合租' },
];

export function LivingCostCard({ cityName, annualSalary, value, onChange, housingData, incomeData }: Props) {
  const subMode = value;

  const result = useMemo(
    () => calculateLivingCost(cityName, annualSalary, housingData, incomeData),
    [cityName, annualSalary, housingData, incomeData],
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

  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">生活成本分析</h4>
        <p className="text-xs text-gray-400">
          暂无「{cityName}」的生活成本数据，目前支持：北京、上海、深圳、广州、杭州、南京、成都、武汉、西安、合肥、青岛
        </p>
      </div>
    );
  }

  const mode: LivingMode = (subMode === 'newhome' || subMode === 'secondhand') ? 'buy' : 'rent';
  const currentBuy = subMode === 'newhome' ? result.newhome : result.secondhand;
  const currentRent = subMode === 'whole' ? result.whole : result.shared;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">生活成本分析</h4>
        <span className="text-sm text-gray-500">{cityName}</span>
      </div>

      {/* 收入对比 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">城市人均收入</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{result.cityAvgIncome.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">/年</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">城市人均支出</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{result.cityAvgConsumption.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">/年</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">收入排名估计</div>
          <div className="text-lg font-semibold text-blue-600">
            前 {result.userIncomePercentile}%
          </div>
          <div className="text-xs text-gray-400">在该城市居民中</div>
        </div>
      </div>

      {/* 单行四选一：新房 | 二手房 | 整租 | 合租 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-4">
        {SUB_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors ${
              subMode === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {mode === 'buy' ? (
        <BuyDetails result={currentBuy} />
      ) : (
        <RentDetails result={currentRent} />
      )}

      {/* 综合居住压力 */}
      <div className="bg-gray-50 rounded-lg p-3 mt-4">
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
        <div className="flex justify-between text-[11px] sm:text-[10px] text-gray-400 mt-1">
          <span>轻松</span>
          <span>合理</span>
          <span>偏高</span>
          <span>沉重</span>
        </div>
      </div>

      {/* 数据来源 */}
      <p className="text-[11px] sm:text-[10px] text-gray-400 text-center mt-3">
        房价数据：creprice.cn 2026-03 | 收入数据：国家统计局 2024
      </p>
    </div>
  );
}

function BuyDetails({ result }: { result: BuyResult }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">买房成本（90㎡）</span>
        <span className={`text-xs font-semibold ${
          result.priceIncomeRatio < 10 ? 'text-green-600' :
          result.priceIncomeRatio < 15 ? 'text-orange-500' : 'text-red-500'
        }`}>
          {result.rating}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">均价</span>
          <span className="font-mono text-gray-900">{result.avgPrice.toFixed(2)} 万元/㎡</span>
        </div>
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
          <span className="font-mono text-gray-900">{result.downPayment} 万 ≈ {result.downPaymentYears.toFixed(1)} 年收入</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">月供（30年/LPR 3.2%）</span>
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
  );
}

function RentDetails({ result }: { result: RentResult }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">租房成本（{result.area}㎡）</span>
        <span className={`text-xs font-semibold ${
          result.rentIncomeRatio < 0.35 ? 'text-green-600' :
          result.rentIncomeRatio < 0.50 ? 'text-orange-500' : 'text-red-500'
        }`}>
          {result.rating}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">月租金</span>
          <span className="font-mono text-gray-900">¥{result.monthlyRent.toLocaleString()}/月</span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>租金收入比 {(result.rentIncomeRatio * 100).toFixed(0)}%</span>
            <span>合理线 30%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getRentBarColor(result.rentIncomeRatio)}`}
              style={{ width: `${Math.min(result.rentIncomeRatio / 0.5 * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

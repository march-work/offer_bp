'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { FreshGradInput, CityCalculationData } from '@/lib/types';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import { FreshGradForm } from '@/components/fresh-graduate/FreshGradForm';
import { FreshGradResult } from '@/components/fresh-graduate/FreshGradResult';
import { LivingCostCard } from '@/components/fresh-graduate/LivingCostCard';
import {
  loadAllCityData,
  computeCityAverageHousing,
  getDistrictHousing,
  buildIndustrySalaryMap,
  commuteMinutesToDailyHours,
  type CityDataBundle,
} from '@/lib/city-data';
import { CITY_OPTIONS } from '@/lib/constants';

const DEFAULT_INPUT: FreshGradInput = {
  bachelorLevel: '双非',
  masterLevel: '无',
  phdLevel: '无',
  targetCity: '上海',
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
  locationPreference: '无所谓',
  housingMode: 'shared',
};

export default function FreshGradPage() {
  const [input, setInput] = useState<FreshGradInput>(DEFAULT_INPUT);
  const [calculatedInput, setCalculatedInput] = useState<FreshGradInput | null>(null);

  // ── 城市数据加载 ──
  const [cityDataBundle, setCityDataBundle] = useState<CityDataBundle | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);

  // 城市变化时加载数据
  useEffect(() => {
    const city = input.targetCity;
    if (!CITY_OPTIONS.includes(city as typeof CITY_OPTIONS[number])) {
      setCityDataBundle(null);
      setDistricts([]);
      return;
    }

    let cancelled = false;
    setDataLoading(true);
    loadAllCityData(city)
      .then((bundle) => {
        if (!cancelled) {
          setCityDataBundle(bundle);
          setDistricts(Object.keys(bundle.housing.districts));
          setDataLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCityDataBundle(null);
          setDistricts([]);
          setDataLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [input.targetCity]);

  // 构建 CityCalculationData
  const cityCalcData = useMemo<CityCalculationData | null>(() => {
    if (!cityDataBundle) return null;

    const avgHousing = computeCityAverageHousing(cityDataBundle.housing);
    const industrySalaries = buildIndustrySalaryMap(cityDataBundle.industrySalary);

    // 如果选了区县，用区县级房价
    let housing = avgHousing;
    if (input.targetDistrict) {
      const districtHousing = getDistrictHousing(cityDataBundle.housing, input.targetDistrict);
      if (districtHousing) housing = districtHousing;
    }

    return {
      income: cityDataBundle.income.per_capita_disposable_income,
      consumption: cityDataBundle.income.per_capita_consumption_expenditure,
      savingsRatio: cityDataBundle.income.savings_ratio,
      secondhandPrice: housing.secondhandPrice,
      newhomePrice: housing.newhomePrice,
      wholeRentPrice: housing.wholeRentPrice,
      sharedRentPrice: housing.sharedRentPrice,
      industrySalaries,
      nationalIncome: 41314,
      nationalExpenditure: 28227,
      nationalSavingsRatio: 1.46,
    };
  }, [cityDataBundle, input.targetDistrict]);

  const handleInputChange = useCallback(
    (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => {
      setInput((prev) => {
        const next = { ...prev, [field]: value };
        if (field === 'wfhDaysPerWeek' && (value as number) > next.workDaysPerWeek) {
          next.wfhDaysPerWeek = next.workDaysPerWeek;
        }
        if (field === 'targetCity') {
          next.targetDistrict = '';
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

  // 计算城市储蓄率归一化基数（使用所有城市数据）
  const citySavingsRateAvg = useMemo(() => {
    if (!cityCalcData) return 0.3;
    // 简单估算：使用当前城市的储蓄率作为基准，或者使用固定值
    const savingsRate = (cityCalcData.income - cityCalcData.consumption 
      - cityCalcData.sharedRentPrice * 20 * 12) / cityCalcData.income;
    return Math.max(0.1, Math.min(0.5, savingsRate));
  }, [cityCalcData]);

  const result = useMemo(() => {
    if (!calculatedInput || !cityCalcData) return null;
    const tc = calculateTotalCompensation(calculatedInput);
    if (tc <= 0) return null;
    return calculateFreshGradScore(calculatedInput, cityCalcData, citySavingsRateAvg);
  }, [calculatedInput, cityCalcData, citySavingsRateAvg]);

  const tc = useMemo(() => {
    if (!calculatedInput) return 0;
    return calculateTotalCompensation(calculatedInput);
  }, [calculatedInput]);

  // LivingCostCard 需要的数据
  const livingCostHousing = useMemo(() => {
    if (!cityCalcData) return undefined;
    return {
      secondhandPrice: cityCalcData.secondhandPrice,
      newhomePrice: cityCalcData.newhomePrice,
      wholeRentPrice: cityCalcData.wholeRentPrice,
      sharedRentPrice: cityCalcData.sharedRentPrice,
    };
  }, [cityCalcData]);

  const livingCostIncome = useMemo(() => {
    if (!cityCalcData) return undefined;
    return {
      income: cityCalcData.income,
      consumption: cityCalcData.consumption,
    };
  }, [cityCalcData]);

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
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-6xl mx-auto px-4 py-4 pb-24 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* 左栏: 表单 */}
          <div className="lg:col-span-3">
            <FreshGradForm
              input={input}
              onChange={handleInputChange}
              onCalculate={handleCalculate}
              districts={districts}
              dataLoading={dataLoading}
            />
          </div>
          {/* 右栏: 结果 */}
          <div className="lg:col-span-2">
            <div className="sticky top-16 space-y-4">
              <FreshGradResult result={result} input={calculatedInput ?? input} />
              <LivingCostCard
                cityName={calculatedInput?.targetCity ?? input.targetCity}
                annualSalary={tc}
                value={input.housingMode}
                onChange={(mode) => handleInputChange('housingMode', mode)}
                housingData={livingCostHousing}
                incomeData={livingCostIncome}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 移动端底部固定栏 */}
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

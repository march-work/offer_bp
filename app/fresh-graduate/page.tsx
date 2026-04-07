'use client';

import { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { CITY_OPTIONS, NATIONAL_INCOME, NATIONAL_EXPENDITURE, NATIONAL_SAVINGS_RATIO, CITY_SAVINGS_RATE_AVG } from '@/lib/constants';

export type EvalMode = 'quick' | 'detailed';

/** 极速版隐藏的字段及其中性默认值（所有系数为 1.0，金额为 0，天数为标准值） */
const QUICK_DEFAULTS: Partial<FreshGradInput> = {
  locationPreference: '无所谓',
  annualStock: 0,
  monthlyAllowance: 0,
  hasExtraInsurance: false,
  salaryPaymentTiming: '次月15日前',
  wfhDaysPerWeek: 0,
  publicHolidays: 13,
  paidSickLeave: 0,
  commuteHours: 0,
  growthFactor: '一般',
  roleCoreFactor: '一般',
};

// ── Suspense wrapper ──
export default function FreshGradPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FreshGradPage />
    </Suspense>
  );
}

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
  hasShuttle: false,
  hasCafeteria: false,
  cafeteriaQuality: '普通',
  locationPreference: '无所谓',
  hasSocialInsurance: '',
  hasHousingFund: '',
  socialInsuranceBase: 0,
  housingFundBase: 0,
  hasExtraInsurance: false,
  salaryPaymentTiming: '次月15日前',
  growthFactor: '一般',
  roleCoreFactor: '一般',
  companySizeFactor: '中型公司',
  overtimeCultureFactor: '偶尔加班',
  housingMode: 'shared',
};

function FreshGradPage() {
  const searchParams = useSearchParams();
  const mode: EvalMode = searchParams.get('mode') === 'quick' ? 'quick' : 'detailed';

  const [input, setInput] = useState<FreshGradInput>({
    ...DEFAULT_INPUT,
    ...(mode === 'quick' ? QUICK_DEFAULTS : {}),
  });
  const [calculatedInput, setCalculatedInput] = useState<FreshGradInput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const districtHousing = getDistrictHousing(cityDataBundle.housing, input.targetDistrict, avgHousing);
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
      nationalIncome: NATIONAL_INCOME,
      nationalExpenditure: NATIONAL_EXPENDITURE,
      nationalSavingsRatio: NATIONAL_SAVINGS_RATIO,
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
      setErrorMsg('请先填写月薪（月薪需大于 0）');
      return;
    }
    if (!input.hasSocialInsurance) {
      setErrorMsg('请选择是否有五险');
      return;
    }
    if (!input.hasHousingFund) {
      setErrorMsg('请选择是否有公积金');
      return;
    }
    if (input.hasSocialInsurance === '有' && (!input.socialInsuranceBase || input.socialInsuranceBase <= 0)) {
      setErrorMsg('请填写五险基数');
      return;
    }
    if (input.hasHousingFund === '有' && (!input.housingFundBase || input.housingFundBase <= 0)) {
      setErrorMsg('请填写公积金基数');
      return;
    }
    setErrorMsg(null);
    setCalculatedInput({ ...input });
  }, [input]);

  const result = useMemo(() => {
    if (!calculatedInput || !cityCalcData) return null;
    const tc = calculateTotalCompensation(calculatedInput);
    if (tc <= 0) return null;
    return calculateFreshGradScore(calculatedInput, cityCalcData);
  }, [calculatedInput, cityCalcData]);

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
              <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full align-middle ${
                mode === 'quick' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {mode === 'quick' ? '极速版' : '详细版'}
              </span>
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
              mode={mode}
            />
          </div>
          {/* 右栏: 结果 */}
          <div className="lg:col-span-2">
            <div className="sticky top-16 space-y-4">
              {errorMsg && (
                <div className="hidden lg:flex bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 items-center justify-between">
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="ml-2 text-red-400 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-2xl font-bold ${result.rating.color}`}>
                {result.score.toFixed(2)}
              </span>
              <span className={`text-sm font-semibold ${result.rating.color}`}>
                {result.rating.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCalculate}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg active:bg-blue-800 transition-colors"
            >
              重新评测
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="text-red-600 text-xs mb-2 text-center animate-pulse">
                {errorMsg}
              </div>
            )}
            <button
              type="button"
              onClick={handleCalculate}
              className="w-full py-3 bg-blue-600 text-white text-base font-semibold rounded-xl active:bg-blue-800 transition-colors"
            >
              开始评测
            </button>
          </>
        )}
      </div>
    </div>
  );
}

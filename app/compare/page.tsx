'use client';

import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { FreshGradInput, FreshGradResult, CityCalculationData, SharedFields, CompareItem } from '@/lib/types';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import {
  loadAllCityData,
  computeCityAverageHousing,
  getDistrictHousing,
  buildIndustrySalaryMap,
  type CityDataBundle,
} from '@/lib/city-data';
import {
  INDUSTRY_OPTIONS,
  BACHELOR_OPTIONS,
  MASTER_OPTIONS,
  PHD_OPTIONS,
  DEFAULT_FRESH_GRAD_INPUT,
} from '@/lib/constants';
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/lib/compare-store';
import { CompareCard } from '@/components/compare/CompareCard';
import { CompareTable } from '@/components/compare/CompareTable';
import { RadarChart } from '@/components/compare/RadarChart';

// 新 offer 的默认值将基于 DEFAULT_FRESH_GRAD_INPUT 与共享字段合并得到

// ── 每个 offer 卡片的本地状态 ──
interface OfferSlot {
  id: string;
  label: string;
  input: FreshGradInput;
  result: FreshGradResult | null;
  cityDataBundle: (CityDataBundle & { _city?: string }) | null;
  cityCalcData: CityCalculationData | null;
  districts: string[];
  dataLoading: boolean;
  mode: 'quick' | 'detailed'; // ← NEW per-card mode
}

let nextSlotId = 1;
function generateSlotId(): string {
  return `slot_${nextSlotId++}`;
}

// ── Suspense wrapper ──
export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const { sharedFields, setSharedFields, addItem, removeItem, items: storeItems } = useCompareStore();
  const [slots, setSlots] = useState<OfferSlot[]>([]);

  // ── 从 store 恢复已有的 offer ──
  useEffect(() => {
    if (storeItems.length === 0) return;
    setSlots((prev) => {
      if (prev.length > 0) return prev; // 已经有 slot 就不覆盖
      return storeItems.map((item, i) => ({
        id: item.id,
        label: item.label,
        input: { ...item.input },
        result: item.result,
        cityDataBundle: null,
        cityCalcData: null,
        districts: [],
        dataLoading: false,
        mode: 'quick',
      }));
    });
  }, [storeItems]);

  // ── 添加 offer ──
  const handleAddSlot = useCallback(() => {
    if (slots.length >= MAX_COMPARE_ITEMS) return;
    const id = generateSlotId();
    const input: FreshGradInput = {
      ...DEFAULT_FRESH_GRAD_INPUT,
      bachelorLevel: sharedFields.bachelorLevel,
      masterLevel: sharedFields.masterLevel,
      phdLevel: sharedFields.phdLevel,
      targetIndustry: sharedFields.targetIndustry,
    };
    setSlots((prev) => {
      // 使用已有 slot 中最大的字母序号 +1，避免重复
      const existingLetters = prev.map((s) => {
        const m = s.label.match(/^Offer ([A-Z])$/);
        return m ? m[1].charCodeAt(0) - 65 : -1;
      });
      const nextIdx = Math.max(prev.length - 1, ...existingLetters) + 1;
      const label = `Offer ${String.fromCharCode(65 + nextIdx)}`;
      return [...prev, {
        id,
        label,
        input,
        result: null,
        cityDataBundle: null,
        cityCalcData: null,
        districts: [],
        dataLoading: false,
        mode: 'quick',
      }];
    });
  }, [slots.length, sharedFields]);

  // per-slot mode update handler
  const handleSlotModeChange = useCallback((id: string, mode: 'quick' | 'detailed') => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, mode } : s));
  }, []);

  // ── 删除 offer ──
  const handleRemoveSlot = useCallback((id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    removeItem(id);
  }, [removeItem]);

  // ── 更新 offer 字段 ──
  const handleSlotInputChange = useCallback((id: string, field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => {
    setSlots((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const next: FreshGradInput = { ...s.input, [field]: value };
      if (field === 'wfhDaysPerWeek' && (value as number) > next.workDaysPerWeek) {
        next.wfhDaysPerWeek = next.workDaysPerWeek;
      }
      if (field === 'targetCity') {
        next.targetDistrict = '';
      }
      return { ...s, input: next, result: null };
    }));
  }, []);

  // ── 更新 offer 名称 ──
  const handleSlotLabelChange = useCallback((id: string, label: string) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, label } : s));
  }, []);

  // ── 城市数据加载 ──
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    slots.forEach((slot) => {
      const city = slot.input.targetCity;
      if (!city) return;
      const loadedCity = slot.cityDataBundle?._city;
      if (loadedCity === city) return;
      if (loadingRef.current.has(slot.id)) return;

      loadingRef.current.add(slot.id);
      setSlots((prev) => prev.map((s) =>
        s.id === slot.id ? { ...s, dataLoading: true } : s,
      ));

      loadAllCityData(city)
        .then((bundle) => {
          loadingRef.current.delete(slot.id);
          const avgHousing = computeCityAverageHousing(bundle.housing);
          const industrySalaries = buildIndustrySalaryMap(bundle.industrySalary);

          setSlots((prev) => prev.map((s) => {
            if (s.id !== slot.id) return s;
            if (s.input.targetCity !== city) return { ...s, dataLoading: false };
            let housing = avgHousing;
            if (s.input.targetDistrict) {
              const districtHousing = getDistrictHousing(bundle.housing, s.input.targetDistrict, avgHousing);
              if (districtHousing) housing = districtHousing;
            }
            const cityCalcData: CityCalculationData = {
              income: bundle.income.per_capita_disposable_income,
              consumption: bundle.income.per_capita_consumption_expenditure,
              secondhandPrice: housing.secondhandPrice,
              newhomePrice: housing.newhomePrice,
              wholeRentPrice: housing.wholeRentPrice,
              sharedRentPrice: housing.sharedRentPrice,
              industrySalaries,
            };
            return {
              ...s,
              cityDataBundle: { ...bundle, _city: city },
              cityCalcData,
              districts: Object.keys(bundle.housing.districts),
              dataLoading: false,
            };
          }));
        })
        .catch(() => {
          loadingRef.current.delete(slot.id);
          setSlots((prev) => prev.map((s) =>
            s.id === slot.id ? { ...s, cityDataBundle: null, cityCalcData: null, dataLoading: false } : s,
          ));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map((s) => `${s.id}:${s.input.targetCity}`).join('|')]);

  // ── 用 ref 跟踪最新 slots，以便在事件处理器中安全读取 ──
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  // ── 计算 offer ──
  const handleCalculate = useCallback((id: string) => {
    const slot = slotsRef.current.find((s) => s.id === id);
    if (!slot?.cityCalcData) return;
    const tc = calculateTotalCompensation(slot.input);
    if (tc <= 0) return;
    const result = calculateFreshGradScore(slot.input, slot.cityCalcData);
    // 两个 setState 分别调用（事件处理器中安全）
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, result } : s));
    addItem(slot.label, slot.input, result);
  }, [addItem]);

  // ── 共享字段变更时，同步到所有 slot ──
  const handleSharedFieldChange = useCallback((field: keyof SharedFields, value: string) => {
    const next = { ...sharedFields, [field]: value };
    setSharedFields(next);
    setSlots((prev) => prev.map((s) => ({
      ...s,
      input: { ...s.input, [field]: value },
      result: null,
    })));
  }, [sharedFields, setSharedFields]);

  // 有结果的 items（给 CompareTable 用）
  const comparableItems: CompareItem[] = useMemo(
    () => slots.filter((s) => s.result !== null).map((s) => ({
      id: s.id,
      label: s.label,
      input: s.input,
      result: s.result!,
    })),
    [slots],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 首页
          </Link>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">
            Offer 对比
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* 共享字段: 学历 + 行业 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎓</span>
            <span className="text-sm font-semibold text-gray-700">共享信息</span>
            <span className="text-xs text-gray-400">（所有 offer 共用，修改后自动同步）</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 学历选择 */}
            <div>
              <div className="text-xs text-gray-500 mb-1.5">学历</div>
              <div className="space-y-1.5">
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">本科</div>
                  <div className="flex flex-wrap gap-1">
                    {BACHELOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSharedFieldChange('bachelorLevel', opt.label)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                          sharedFields.bachelorLevel === opt.label
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                        }`}
                      >
                        {opt.label}
                      </button>
      ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">硕士</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleSharedFieldChange('masterLevel', '无')}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        sharedFields.masterLevel === '无'
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                      }`}
                    >
                      无
                    </button>
                    {MASTER_OPTIONS.filter((o) => o.label !== '直博').map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSharedFieldChange('masterLevel', opt.label)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                          sharedFields.masterLevel === opt.label
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">博士</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleSharedFieldChange('phdLevel', '无')}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        sharedFields.phdLevel === '无'
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                      }`}
                    >
                      无
                    </button>
                    {PHD_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSharedFieldChange('phdLevel', opt.label)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                          sharedFields.phdLevel === opt.label
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* 行业 */}
            <div>
              <div className="text-xs text-gray-500 mb-1.5">专业/行业</div>
              <select
                value={sharedFields.targetIndustry}
                onChange={(e) => handleSharedFieldChange('targetIndustry', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Offer 卡片 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Offer 列表
              <span className="text-xs text-gray-400 font-normal ml-1">({slots.length}/{MAX_COMPARE_ITEMS})</span>
            </h2>
            <button
              type="button"
              onClick={handleAddSlot}
              disabled={slots.length >= MAX_COMPARE_ITEMS}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                slots.length < MAX_COMPARE_ITEMS
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              + 添加 Offer
            </button>
          </div>

          {slots.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">⚖️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">添加 Offer 开始对比</h3>
              <p className="text-sm text-gray-400 mb-4">
                点击「添加 Offer」输入多个 offer 的详细信息，逐维度量化对比。
              </p>
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                添加第一个 Offer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <CompareCard
                  key={slot.id}
                  label={slot.label}
                  input={slot.input}
                  result={slot.result}
                  onLabelChange={(lbl) => handleSlotLabelChange(slot.id, lbl)}
                  onInputChange={(field, value) => handleSlotInputChange(slot.id, field, value)}
                  onCalculate={() => handleCalculate(slot.id)}
                  onRemove={() => handleRemoveSlot(slot.id)}
                  districts={slot.districts}
                  dataLoading={slot.dataLoading}
                  mode={slot.mode}
                  onModeChange={(m) => handleSlotModeChange(slot.id, m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 对比表格 */}
        {comparableItems.length >= 2 && (
          <>
            <RadarChart items={comparableItems} />
            <CompareTable items={comparableItems} />
          </>
        )}
        {comparableItems.length === 1 && (
          <div className="text-center text-xs text-gray-400 py-4">
            再计算一个 offer 即可查看维度对比表
          </div>
        )}
      </main>
    </div>
  );
}

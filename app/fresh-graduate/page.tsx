'use client';

import { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { FreshGradInput, FreshGradResult as FreshGradResultType, CityCalculationData } from '@/lib/types';
import { DEFAULT_FRESH_GRAD_INPUT, QUICK_MODE_OVERRIDES } from '@/lib/constants';
import { calculateFreshGradScore, calculateTotalCompensation } from '@/lib/calculate';
import { FreshGradForm } from '@/components/fresh-graduate/FreshGradForm';
import { FreshGradResult } from '@/components/fresh-graduate/FreshGradResult';
import { LivingCostCard } from '@/components/fresh-graduate/LivingCostCard';
import {
  loadAllCityData,
  buildCityCalcData,
  type CityDataBundle,
} from '@/lib/city-data';
import { CITY_OPTIONS } from '@/lib/constants';
import { useCompareStore } from '@/lib/compare-store';
import { generateId } from '@/lib/compare-store';

export type EvalMode = 'quick' | 'detailed';

/** 极速版隐藏字段默认值将由 DEFAULT_FRESH_GRAD_INPUT 与 QUICK_MODE_OVERRIDES 合并得到 */
// ── Suspense wrapper ──
export default function FreshGradPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FreshGradPage />
    </Suspense>
  );
}

function FreshGradPage() {
  const searchParams = useSearchParams();
  const mode: EvalMode = searchParams.get('mode') === 'quick' ? 'quick' : 'detailed';

  const [input, setInput] = useState<FreshGradInput>({
    ...DEFAULT_FRESH_GRAD_INPUT,
    ...(mode === 'quick' ? QUICK_MODE_OVERRIDES : {}),
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
    return buildCityCalcData(cityDataBundle, input.targetDistrict || undefined);
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
    return calculateTotalCompensation(input);
  }, [input]);

  // ── 自动保存到对比 store (使用稳定的外部 ID) ──
  const { addItem, updateItem } = useCompareStore();
  const autoSavedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!result || !calculatedInput) return;
    const label = `${calculatedInput.targetCity}-${calculatedInput.targetIndustry.slice(0, 4)}`;
    const id = autoSavedIdRef.current;
    if (id) {
      updateItem(id, { label, input: { ...calculatedInput }, result: { ...result } });
    } else {
      const newId = generateId();
      addItem(label, calculatedInput, result, newId);
      autoSavedIdRef.current = newId;
    }
  }, [result]);

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
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
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
                cityName={input.targetCity}
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

      {/* 可拖拽悬浮评测按钮 */}
      <DraggableFab
        onCalculate={handleCalculate}
        errorMsg={errorMsg}
        onDismissError={() => setErrorMsg(null)}
        result={result}
      />
    </div>
  );
}

// ── 可拖拽悬浮按钮（松手吸附左/右边缘）──
function DraggableFab({
  onCalculate,
  errorMsg,
  onDismissError,
  result,
}: {
  onCalculate: () => void;
  errorMsg: string | null;
  onDismissError: () => void;
  result: FreshGradResultType | null;
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const BALL = isMobile ? 56 : 72;
  const EDGE_GAP = isMobile ? 12 : 20;

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const [snapping, setSnapping] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  // 使用 visualViewport 获取真实可视区域高度（移动端排除 URL 栏/底部栏）
  const getVH = useCallback(() => (window.visualViewport?.height ?? window.innerHeight), []);

  // 初始定位 + 视口变化时重新约束位置
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = getVH();
    setPos({ x: vw - BALL - EDGE_GAP, y: vh - BALL - 24 });
    setMounted(true);

    const handleViewportChange = () => {
      const newVW = window.innerWidth;
      const newVH = getVH();
      setPos(prev => ({
        x: Math.max(EDGE_GAP, Math.min(prev.x, newVW - BALL - EDGE_GAP)),
        y: Math.max(EDGE_GAP, Math.min(prev.y, newVH - BALL - EDGE_GAP)),
      }));
    };

    window.addEventListener('resize', handleViewportChange);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [getVH]);

  function clampToViewport(x: number, y: number) {
    return {
      x: Math.max(EDGE_GAP, Math.min(x, window.innerWidth - BALL - EDGE_GAP)),
      y: Math.max(EDGE_GAP, Math.min(y, getVH() - BALL - EDGE_GAP)),
    };
  }

  /** 吸附到最近的左/右边缘 */
  function snapToEdge(x: number, y: number) {
    const midX = window.innerWidth / 2;
    const edgeX = x + BALL / 2 < midX ? EDGE_GAP : window.innerWidth - BALL - EDGE_GAP;
    return { x: edgeX, y };
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setSnapping(false);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      originX: pos.x, originY: pos.y,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    setPos(clampToViewport(d.originX + dx, d.originY + dy));
  }, [getVH]);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      onCalculate();
      dragRef.current = null;
      return;
    }
    setSnapping(true);
    setPos(snapToEdge(pos.x, pos.y));
    dragRef.current = null;
  }, [onCalculate, pos]);

  const onTransitionEnd = useCallback(() => {
    setSnapping(false);
  }, []);

  // 气泡方向：靠左 → 内容左对齐，靠右 → 内容右对齐
  const isNearRight = mounted && pos.x + BALL / 2 > window.innerWidth / 2;
  const alignClass = isNearRight ? 'items-end' : 'items-start';

  if (!mounted) return null;

  return (
    <div
      className={`fixed z-20 flex flex-col ${alignClass} gap-2 select-none`}
      style={{
        left: pos.x,
        top: pos.y,
        transition: snapping ? 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
      }}
      onTransitionEnd={onTransitionEnd}
    >
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 max-w-[220px] shadow-lg">
          {errorMsg}
          <button type="button" onClick={onDismissError} className="ml-1 text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-center">
          <span className={`text-lg font-bold ${result.rating.color}`}>{result.score.toFixed(2)}</span>
          <span className={`ml-1.5 text-xs font-semibold ${result.rating.color}`}>{result.rating.label}</span>
        </div>
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-90 active:bg-blue-800 transition-colors flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        style={{ width: BALL, height: BALL }}
        title="拖拽移动，点击计算"
      >
        <span className={`font-bold leading-none ${isMobile ? 'text-xs' : 'text-sm'}`}>计算</span>
      </button>
    </div>
  );
}

// ── 城市生活成本计算模块 ──
// 数据来源：国家统计局 2024 年城镇居民数据 + creprice.cn 2026-03 房价数据

import type { CityLivingData, CityIncomeData, CityHousingData } from './types';
import {
  getSimpleRating,
  RENT_RATING_CONFIG,
  BUY_RATING_CONFIG,
  PRESSURE_RATING_CONFIG,
} from './constants';

// ── 计算结果类型 ──
export type RentMode = 'whole' | 'shared';

export interface BuyResult {
  avgPrice: number;
  totalPrice: number;
  priceIncomeRatio: number;
  downPayment: number;
  downPaymentYears: number;
  monthlyPayment: number;
  mortgageIncomeRatio: number;
  rating: string;
}

export interface RentResult {
  monthlyRent: number;
  area: number;
  rentIncomeRatio: number;
  rating: string;
}

export interface LivingCostResult {
  cityName: string;
  secondhand: BuyResult;
  newhome: BuyResult;
  whole: RentResult;
  shared: RentResult;
  cityAvgIncome: number;
  cityAvgConsumption: number;
  userIncomePercentile: number;
  livingPressureIndex: number;
  pressureRating: string;
  pressureColor: string;
}

// ── 默认参数 ──
export const DEFAULT_BUY_AREA = 90;
export const DEFAULT_WHOLE_RENT_AREA = 60;
export const DEFAULT_SHARED_RENT_AREA = 20;
export const DOWN_PAYMENT_RATIO = 0.30;
export const LOAN_YEARS = 30;
export const INTEREST_RATE = 0.032;

// ── 类型（供组件使用）──
export type BuyMode = 'secondhand' | 'newhome';
export type LivingMode = 'buy' | 'rent';

// ── 等额本息月供 ──
export function calcMonthlyPayment(loanWan: number, annualRate: number, years: number): number {
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0 || months <= 0) return 0;
  const loan = loanWan * 10000;
  return loan * (monthlyRate * Math.pow(1 + monthlyRate, months))
    / (Math.pow(1 + monthlyRate, months) - 1);
}

function computeBuyResult(unitPrice: number, annualSalary: number): BuyResult {
  const monthlyIncome = annualSalary / 12;
  const incomeWan = annualSalary / 10000;
  const totalPrice = +(unitPrice * DEFAULT_BUY_AREA).toFixed(1);
  const downPayment = +(totalPrice * DOWN_PAYMENT_RATIO).toFixed(1);
  const loan = totalPrice - downPayment;
  const monthlyPayment = Math.round(calcMonthlyPayment(loan, INTEREST_RATE, LOAN_YEARS));
  const priceIncomeRatio = +(totalPrice / incomeWan).toFixed(1);
  const downPaymentYears = +(downPayment / incomeWan).toFixed(1);
  const mortgageIncomeRatio = +(monthlyPayment / monthlyIncome).toFixed(3);
  const { label, color } = getSimpleRating(priceIncomeRatio, BUY_RATING_CONFIG);
  return {
    avgPrice: unitPrice,
    totalPrice,
    priceIncomeRatio,
    downPayment,
    downPaymentYears,
    monthlyPayment,
    mortgageIncomeRatio,
    rating: label,
  };
}

function computeRentResult(unitPrice: number, area: number, annualSalary: number): RentResult {
  const monthlyIncome = annualSalary / 12;
  const monthlyRent = Math.round(unitPrice * area);
  const rentIncomeRatio = +(monthlyRent / monthlyIncome).toFixed(3);
  const { label, color } = getSimpleRating(rentIncomeRatio, RENT_RATING_CONFIG);
  return { monthlyRent, area, rentIncomeRatio, rating: label };
}

// ── 简易收入百分位估计 ──
function estimateIncomePercentile(userAnnualIncome: number, cityAvgIncome: number): number {
  if (cityAvgIncome <= 0) return 50;
  const ratio = userAnnualIncome / cityAvgIncome;
  const z = (Math.log(ratio + 0.01) + 0.1) / 0.7;
  const percentile = Math.round(normalCDF(z) * 100);
  return Math.max(1, Math.min(99, percentile));
}

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

// ── 外部数据参数类型（使用类型组合）──
export type ExternalLivingData = CityHousingData;
export type ExternalIncomeData = CityIncomeData;

// ── 主计算函数 ──
export function calculateLivingCost(
  cityName: string,
  annualSalary: number,
  housingData?: ExternalLivingData | null,
  incomeData?: ExternalIncomeData | null,
): LivingCostResult | null {
  // 必须提供数据（从 JSON 文件加载）
  const cityData = incomeData
    ? { income: incomeData.income, consumption: incomeData.consumption }
    : null;

  const housing = housingData ?? null;
  if (!housing || !cityData || annualSalary <= 0) return null;

  const secondhand = computeBuyResult(housing.secondhandPrice, annualSalary);
  const newhome = computeBuyResult(housing.newhomePrice, annualSalary);
  const whole = computeRentResult(housing.wholeRentPrice, DEFAULT_WHOLE_RENT_AREA, annualSalary);
  const shared = computeRentResult(housing.sharedRentPrice, DEFAULT_SHARED_RENT_AREA, annualSalary);

  const livingPressureIndex = +(
    (secondhand.priceIncomeRatio / 10) * 0.5
    + (whole.rentIncomeRatio / 0.3) * 0.3
    + (1 - cityData.consumption / cityData.income) * 0.2
  ).toFixed(3);

  const pressure = getSimpleRating(livingPressureIndex, PRESSURE_RATING_CONFIG);
  const percentile = estimateIncomePercentile(annualSalary, cityData.income);

  return {
    cityName,
    secondhand,
    newhome,
    whole,
    shared,
    cityAvgIncome: cityData.income,
    cityAvgConsumption: cityData.consumption,
    userIncomePercentile: percentile,
    livingPressureIndex,
    pressureRating: pressure.label,
    pressureColor: pressure.color,
  };
}

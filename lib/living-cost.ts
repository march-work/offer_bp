// ── 城市生活成本计算模块 ──
// 数据来源：国家统计局 2024 年城镇居民数据 + creprice.cn 2026-03 房价数据

import type { CityTier } from './types';

// ── 城市生活成本数据 ──
// income: 全市居民人均可支配收入（元/年）
// consumption: 全市居民人均消费支出（元/年）
// secondhandPrice: 二手房均价（万元/㎡）
// wholeRentPrice: 整租均价（元/月/㎡）
// sharedRentPrice: 合租均价（元/月/㎡）
export interface CityLivingData {
  income: number;
  consumption: number;
  secondhandPrice: number;
  wholeRentPrice: number;
  sharedRentPrice: number;
}

export const CITY_LIVING_DATA: Record<string, CityLivingData> = {
  '北京': {
    income: 89090, consumption: 50667,
    secondhandPrice: 4.78, wholeRentPrice: 66.08, sharedRentPrice: 135.93,
  },
  '上海': {
    income: 91987, consumption: 54765,
    secondhandPrice: 5.58, wholeRentPrice: 78.85, sharedRentPrice: 92.00,
  },
  '深圳': {
    income: 84945, consumption: 51415,
    secondhandPrice: 7.41, wholeRentPrice: 81.21, sharedRentPrice: 123.86,
  },
  '广州': {
    income: 80591, consumption: 49500,
    secondhandPrice: 2.88, wholeRentPrice: 39.37, sharedRentPrice: 63.20,
  },
  '杭州': {
    income: 80017, consumption: 55592,
    secondhandPrice: 2.74, wholeRentPrice: 39.99, sharedRentPrice: 50.28,
  },
  '南京': {
    income: 78243, consumption: 47000,
    secondhandPrice: 2.14, wholeRentPrice: 33.74, sharedRentPrice: 55.09,
  },
  '成都': {
    income: 55000, consumption: 35000,
    secondhandPrice: 1.18, wholeRentPrice: 24.90, sharedRentPrice: 43.58,
  },
  '武汉': {
    income: 62530, consumption: 39625,
    secondhandPrice: 1.13, wholeRentPrice: 23.22, sharedRentPrice: 45.38,
  },
  '西安': {
    income: 47496, consumption: 30000,
    secondhandPrice: 1.21, wholeRentPrice: 23.45, sharedRentPrice: 34.03,
  },
  '合肥': {
    income: 58930, consumption: 32442,
    secondhandPrice: 1.36, wholeRentPrice: 22.70, sharedRentPrice: 34.34,
  },
  '青岛': {
    income: 62738, consumption: 36450,
    secondhandPrice: 1.46, wholeRentPrice: 20.54, sharedRentPrice: 36.76,
  },
};

// ── 城市等级 → 可选城市列表 ──
export const CITY_TIER_CITIES: Record<string, string[]> = {
  '超一线': ['北京', '上海', '深圳'],
  '一线': ['广州', '杭州'],
  '新一线': ['成都', '武汉', '南京', '西安'],
  '二线': ['合肥', '青岛'],
  '三线及以下': [],
};

// ── 计算结果类型 ──
export interface LivingCostResult {
  cityName: string;

  // 租房指标
  wholeRentMonthly: number;       // 整租月租（元）= unitPrice × area
  sharedRentMonthly: number;      // 合租月租（元）
  wholeRentIncomeRatio: number;   // 整租收入比
  sharedRentIncomeRatio: number;  // 合租收入比

  // 买房指标
  totalPrice: number;             // 房屋总价（万元）= unitPrice × area
  priceIncomeRatio: number;       // 总价收入比
  downPaymentYears: number;       // 首付需要攒多少年
  monthlyPayment: number;         // 月供（元）
  mortgageIncomeRatio: number;    // 月供收入比

  // 综合指标
  livingPressureIndex: number;    // 居住压力指数

  // 城市对比
  cityAvgIncome: number;          // 城市人均收入
  userIncomePercentile: number;   // 用户收入在城市的百分位估计

  // 评级
  rentRating: string;
  buyRating: string;
  pressureRating: string;
  pressureColor: string;
}

// ── 默认参数 ──
const DEFAULT_BUY_AREA = 90;       // 买房面积（㎡）
const DEFAULT_WHOLE_RENT_AREA = 60; // 整租面积（㎡）
const DEFAULT_SHARED_RENT_AREA = 20; // 合租面积（㎡）
const DOWN_PAYMENT_RATIO = 0.30;
const LOAN_YEARS = 30;
const INTEREST_RATE = 0.031;       // 当前 LPR 约 3.1%

// ── 评级函数 ──
function getRentRating(ratio: number): string {
  if (ratio < 0.25) return '轻松';
  if (ratio < 0.35) return '合理';
  if (ratio < 0.50) return '偏高';
  return '沉重';
}

function getBuyRating(ratio: number): string {
  if (ratio < 6) return '轻松';
  if (ratio < 10) return '合理';
  if (ratio < 15) return '偏高';
  return '沉重';
}

function getPressureInfo(index: number): { rating: string; color: string } {
  if (index < 0.5) return { rating: '轻松', color: 'text-green-500' };
  if (index < 0.8) return { rating: '合理', color: 'text-blue-500' };
  if (index < 1.2) return { rating: '偏高', color: 'text-orange-500' };
  return { rating: '沉重', color: 'text-red-500' };
}

// ── 等额本息月供 ──
function calcMonthlyPayment(loanWan: number, annualRate: number, years: number): number {
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0 || months <= 0) return 0;
  const loan = loanWan * 10000;
  return loan * (monthlyRate * Math.pow(1 + monthlyRate, months))
    / (Math.pow(1 + monthlyRate, months) - 1);
}

// ── 简易收入百分位估计 ──
// 基于城市人均收入和 log-normal 分布近似
function estimateIncomePercentile(userAnnualIncome: number, cityAvgIncome: number): number {
  if (cityAvgIncome <= 0) return 50;
  const ratio = userAnnualIncome / cityAvgIncome;
  // 简化：假设收入分布的均值约为人均的 1.0 倍，标准差 0.6 倍
  // 用正态 CDF 近似百分位
  const z = (Math.log(ratio + 0.01) + 0.1) / 0.7;
  const percentile = Math.round(normalCDF(z) * 100);
  return Math.max(1, Math.min(99, percentile));
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun 近似
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

// ── 主计算函数 ──
export function calculateLivingCost(
  cityName: string,
  annualSalary: number,
): LivingCostResult | null {
  const cityData = CITY_LIVING_DATA[cityName];
  if (!cityData || annualSalary <= 0) return null;

  const monthlyIncome = annualSalary / 12;
  const incomeWan = annualSalary / 10000;

  // 租房
  const wholeRentMonthly = Math.round(cityData.wholeRentPrice * DEFAULT_WHOLE_RENT_AREA);
  const sharedRentMonthly = Math.round(cityData.sharedRentPrice * DEFAULT_SHARED_RENT_AREA);
  const wholeRentIncomeRatio = wholeRentMonthly / monthlyIncome;
  const sharedRentIncomeRatio = sharedRentMonthly / monthlyIncome;

  // 买房
  const totalPrice = +(cityData.secondhandPrice * DEFAULT_BUY_AREA).toFixed(1);
  const downPayment = totalPrice * DOWN_PAYMENT_RATIO;
  const loan = totalPrice - downPayment;
  const monthlyPayment = calcMonthlyPayment(loan, INTEREST_RATE, LOAN_YEARS);
  const priceIncomeRatio = totalPrice / incomeWan;
  const downPaymentYears = downPayment / incomeWan;
  const mortgageIncomeRatio = monthlyPayment / monthlyIncome;

  // 居住压力指数（按算法文档公式）
  const livingPressureIndex =
    (priceIncomeRatio / 10) * 0.5
    + (wholeRentIncomeRatio / 0.3) * 0.3
    + (1 - cityData.consumption / cityData.income) * 0.2;

  const pressure = getPressureInfo(livingPressureIndex);
  const percentile = estimateIncomePercentile(annualSalary, cityData.income);

  return {
    cityName,
    wholeRentMonthly,
    sharedRentMonthly,
    wholeRentIncomeRatio,
    sharedRentIncomeRatio,
    totalPrice,
    priceIncomeRatio,
    downPaymentYears,
    monthlyPayment: Math.round(monthlyPayment),
    mortgageIncomeRatio,
    livingPressureIndex: +livingPressureIndex.toFixed(3),
    cityAvgIncome: cityData.income,
    userIncomePercentile: percentile,
    rentRating: getRentRating(wholeRentIncomeRatio),
    buyRating: getBuyRating(priceIncomeRatio),
    pressureRating: pressure.rating,
    pressureColor: pressure.color,
  };
}

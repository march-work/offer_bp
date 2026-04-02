// ── 城市生活成本计算模块 ──
// 数据来源：国家统计局 2024 年城镇居民数据 + creprice.cn 2026-03 房价数据

// ── 城市生活成本数据 ──
export interface CityLivingData {
  income: number;
  consumption: number;
  secondhandPrice: number;
  newhomePrice: number;
  wholeRentPrice: number;
  sharedRentPrice: number;
}

export const CITY_LIVING_DATA: Record<string, CityLivingData> = {
  '北京': {
    income: 89090, consumption: 50667,
    secondhandPrice: 4.78, newhomePrice: 6.50,
    wholeRentPrice: 66.08, sharedRentPrice: 135.93,
  },
  '上海': {
    income: 91987, consumption: 54765,
    secondhandPrice: 5.58, newhomePrice: 7.61,
    wholeRentPrice: 78.85, sharedRentPrice: 92.00,
  },
  '深圳': {
    income: 84945, consumption: 51415,
    secondhandPrice: 7.41, newhomePrice: 6.29,
    wholeRentPrice: 81.21, sharedRentPrice: 123.86,
  },
  '广州': {
    income: 80591, consumption: 49500,
    secondhandPrice: 2.88, newhomePrice: 3.58,
    wholeRentPrice: 39.37, sharedRentPrice: 63.20,
  },
  '杭州': {
    income: 80017, consumption: 55592,
    secondhandPrice: 2.74, newhomePrice: 2.63,
    wholeRentPrice: 39.99, sharedRentPrice: 50.28,
  },
  '南京': {
    income: 78243, consumption: 47000,
    secondhandPrice: 2.14, newhomePrice: 3.09,
    wholeRentPrice: 33.74, sharedRentPrice: 55.09,
  },
  '成都': {
    income: 55000, consumption: 35000,
    secondhandPrice: 1.18, newhomePrice: 1.64,
    wholeRentPrice: 24.90, sharedRentPrice: 43.58,
  },
  '武汉': {
    income: 62530, consumption: 39625,
    secondhandPrice: 1.13, newhomePrice: 1.54,
    wholeRentPrice: 23.22, sharedRentPrice: 45.38,
  },
  '西安': {
    income: 47496, consumption: 30000,
    secondhandPrice: 1.21, newhomePrice: 1.53,
    wholeRentPrice: 23.45, sharedRentPrice: 34.03,
  },
  '合肥': {
    income: 58930, consumption: 32442,
    secondhandPrice: 1.36, newhomePrice: 1.56,
    wholeRentPrice: 22.70, sharedRentPrice: 34.34,
  },
  '青岛': {
    income: 62738, consumption: 36450,
    secondhandPrice: 1.46, newhomePrice: 1.65,
    wholeRentPrice: 20.54, sharedRentPrice: 36.76,
  },
};

// ── 计算结果类型 ──
export type BuyMode = 'secondhand' | 'newhome';
export type RentMode = 'whole' | 'shared';
export type LivingMode = 'buy' | 'rent';

export interface BuyResult {
  avgPrice: number;           // 均价（万元/㎡）
  totalPrice: number;         // 总价（万元）
  priceIncomeRatio: number;   // 总价收入比（年）
  downPayment: number;        // 首付（万元）
  downPaymentYears: number;   // 首付需攒年数
  monthlyPayment: number;     // 月供（元）
  mortgageIncomeRatio: number; // 月供收入比
  rating: string;
}

export interface RentResult {
  monthlyRent: number;        // 月租（元）
  area: number;               // 面积（㎡）
  rentIncomeRatio: number;    // 租金收入比
  rating: string;
}

export interface LivingCostResult {
  cityName: string;

  // 购房数据
  secondhand: BuyResult;
  newhome: BuyResult;

  // 租房数据
  whole: RentResult;
  shared: RentResult;

  // 城市对比
  cityAvgIncome: number;
  userIncomePercentile: number;

  // 综合指标
  livingPressureIndex: number;
  pressureRating: string;
  pressureColor: string;
}

// ── 默认参数 ──
const DEFAULT_BUY_AREA = 90;
const DEFAULT_WHOLE_RENT_AREA = 60;
const DEFAULT_SHARED_RENT_AREA = 20;
const DOWN_PAYMENT_RATIO = 0.30;
const LOAN_YEARS = 30;
const INTEREST_RATE = 0.031;

// ── 评级函数 ──
function getRentRating(ratio: number): string {
  if (ratio < 0.25) return '轻松';
  if (ratio < 0.35) return '合理';
  if (ratio < 0.50) return '偏高';
  return '沉重';
}

function getBuyRating(years: number): string {
  if (years < 6) return '轻松';
  if (years < 10) return '合理';
  if (years < 15) return '偏高';
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
  return {
    avgPrice: unitPrice,
    totalPrice,
    priceIncomeRatio,
    downPayment,
    downPaymentYears,
    monthlyPayment,
    mortgageIncomeRatio,
    rating: getBuyRating(priceIncomeRatio),
  };
}

function computeRentResult(
  unitPrice: number,
  area: number,
  annualSalary: number,
): RentResult {
  const monthlyIncome = annualSalary / 12;
  const monthlyRent = Math.round(unitPrice * area);
  const rentIncomeRatio = +(monthlyRent / monthlyIncome).toFixed(3);
  return {
    monthlyRent,
    area,
    rentIncomeRatio,
    rating: getRentRating(rentIncomeRatio),
  };
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

// ── 主计算函数 ──
export function calculateLivingCost(
  cityName: string,
  annualSalary: number,
): LivingCostResult | null {
  const cityData = CITY_LIVING_DATA[cityName];
  if (!cityData || annualSalary <= 0) return null;

  const secondhand = computeBuyResult(cityData.secondhandPrice, annualSalary);
  const newhome = computeBuyResult(cityData.newhomePrice, annualSalary);
  const whole = computeRentResult(cityData.wholeRentPrice, DEFAULT_WHOLE_RENT_AREA, annualSalary);
  const shared = computeRentResult(cityData.sharedRentPrice, DEFAULT_SHARED_RENT_AREA, annualSalary);

  // 居住压力指数
  const livingPressureIndex = +(
    (secondhand.priceIncomeRatio / 10) * 0.5
    + (whole.rentIncomeRatio / 0.3) * 0.3
    + (1 - cityData.consumption / cityData.income) * 0.2
  ).toFixed(3);

  const pressure = getPressureInfo(livingPressureIndex);
  const percentile = estimateIncomePercentile(annualSalary, cityData.income);

  return {
    cityName,
    secondhand,
    newhome,
    whole,
    shared,
    cityAvgIncome: cityData.income,
    userIncomePercentile: percentile,
    livingPressureIndex,
    pressureRating: pressure.rating,
    pressureColor: pressure.color,
  };
}

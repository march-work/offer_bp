// ── 应届生评测器核心计算函数 ──
// 公式:FreshGrad Score = (dailySalary × envFactor) / (expectedDailySalary × timeFactor)
// 其中 timeFactor = effectiveHours / 8，归一化到标准8小时工作制

// 支持两种数据源：1) 从 JSON 加载的 cityData  2) 回退到硬编码 constants

import type { FreshGradInput, FreshGradResult, RatingInfo, CityCalculationData } from './types';
import {
  STANDARD_WORKING_DAYS,
  STANDARD_HOURS,
  BACHELOR_OPTIONS,
  MASTER_OPTIONS,
  PHD_OPTIONS,
  SALARY_SCORE_MAP,
  INDUSTRY_FACTOR,
  WORK_ENV_FACTOR,
  LEADER_FACTOR,
  GROWTH_FACTOR,
  ROLE_CORE_FACTOR,
  COMPANY_SIZE_FACTOR,
  OVERTIME_CULTURE_FACTOR,
  COLLEAGUE_FACTOR,
  CAFETERIA_FACTOR,
  LOCATION_PREF_FACTOR,
  RATINGS,
} from './constants';
import { getIndustryInfo } from './industry-salary';
import {
  calcMonthlyPayment,
  DEFAULT_BUY_AREA as HOUSING_BUY_AREA,
  DEFAULT_WHOLE_RENT_AREA as HOUSING_WHOLE_RENT_AREA,
  DEFAULT_SHARED_RENT_AREA as HOUSING_SHARED_RENT_AREA,
  DOWN_PAYMENT_RATIO as HOUSING_DOWN_PAYMENT,
  LOAN_YEARS as HOUSING_LOAN_YEARS,
  INTEREST_RATE as HOUSING_INTEREST_RATE,
} from './living-cost';

const SHUTTLE_FACTOR_HAS = 0.3;
const SHUTTLE_FACTOR_NO = 1.0;

const EDUCATION_WEIGHTS: Record<string, { b: number; m: number; p: number }> = {
  bachelor: { b: 0.5, m: 0.0, p: 0.0 },
  master: { b: 0.35, m: 0.65, p: 0.0 },
  phd: { b: 0.25, m: 0.15, p: 0.6 },
  direct_phd: { b: 0.35, m: 0.0, p: 0.65 },
};

// ── 学历分值查找 ──
function getBachelorScore(level: string): number {
  const opt = BACHELOR_OPTIONS.find((o) => o.label === level);
  return opt ? opt.score : 3;
}

function getMasterScore(level: string): number {
  if (!level || level === '无' || level === '直博') return 0;
  const opt = MASTER_OPTIONS.find((o) => o.label === level);
  return opt ? opt.score : 0;
}

function getPhdScore(level: string): number {
  if (!level || level === '无') return 0;
  const opt = PHD_OPTIONS.find((o) => o.label === level);
  return opt ? opt.score : 0;
}

// ── 判断是否直博 ──
function isDirectPhD(masterLevel: string, phdLevel: string): boolean {
  return (masterLevel === '无' || masterLevel === '直博' || !masterLevel) && phdLevel !== '无';
}

// ── 计算学历综合分值 ──
export function calculateEducationScore(input: FreshGradInput): number {
  const b = getBachelorScore(input.bachelorLevel);
  const m = getMasterScore(input.masterLevel);
  const p = getPhdScore(input.phdLevel);
  const hasMaster = !!input.masterLevel && input.masterLevel !== '无' && input.masterLevel !== '直博';
  const hasPhd = !!input.phdLevel && input.phdLevel !== '无';
  const directPhd = isDirectPhD(input.masterLevel, input.phdLevel);
  let weights: { b: number; m: number; p: number };
  if (hasPhd && directPhd) {
    weights = EDUCATION_WEIGHTS.direct_phd;
  } else if (hasPhd && hasMaster) {
    weights = EDUCATION_WEIGHTS.phd;
  } else if (hasMaster) {
    weights = EDUCATION_WEIGHTS.master;
  } else {
    weights = EDUCATION_WEIGHTS.bachelor;
  }
  return b * weights.b + m * weights.m + p * weights.p;
}

/** 分值 → 期望年薪（万元)，线性插值 */
export function scoreToExpectedAnnualWan(score: number): number {
  const map = SALARY_SCORE_MAP;
  if (score <= map[0][0]) return map[0][1];
  if (score >= map[map.length - 1][0]) return map[map.length - 1][1];
  for (let i = 0; i < map.length - 1; i++) {
    const [s0, v0] = map[i];
    const [s1, v1] = map[i + 1];
    if (score >= s0 && score <= s1) {
      const t = (score - s0) / (s1 - s0);
      return v0 + t * (v1 - v0);
    }
  }
  return map[0][1];
}

/** 计算年总包 TC */
export function calculateTotalCompensation(input: FreshGradInput): number {
  return (
    input.monthlyBaseSalary * input.monthsPerYear
    + input.yearEndBonus
    + input.annualStock * 10000
    + input.monthlyAllowance * 12
  );
}

/** 计算年工作日数 */
export function calculateWorkingDays(input: FreshGradInput): number {
  return (
    52 * input.workDaysPerWeek
    - (input.annualLeave + input.publicHolidays + input.paidSickLeave * 0.6)
  );
}

/** 计算真实日薪（CNY） */
export function calculateDailySalary(annualSalary: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return annualSalary / workingDays;
}

/** 计算期望日薪 */
export function calculateExpectedSalary(
  educationScore: number,
  city: string,
  industry: string,
  industrySalaries?: Record<string, number>,
): { expectedAnnual: number; expectedDaily: number; industryAvgSalary: number; industryFactor: number } {
  const baseWan = scoreToExpectedAnnualWan(educationScore);
  const { factor: realIndustryFactor, avgSalary } = getIndustryInfo(city, industry, industrySalaries);
  // 有真实数据用真实因子，否则回退到通用行业因子
  const industryFactor = avgSalary > 0 ? realIndustryFactor : (INDUSTRY_FACTOR[industry] ?? 1.0);
  const expectedAnnual = baseWan * industryFactor * 10000;
  const expectedDaily = expectedAnnual / STANDARD_WORKING_DAYS;
  return { expectedAnnual, expectedDaily, industryAvgSalary: avgSalary, industryFactor };
}

/** 计算办公室比例 */
export function calculateOfficeRatio(input: FreshGradInput): number {
  if (input.workDaysPerWeek <= 0) return 1;
  return (input.workDaysPerWeek - input.wfhDaysPerWeek) / input.workDaysPerWeek;
}

/** 获取班车系数 */
export function getShuttleFactor(hasShuttle: boolean): number {
  return hasShuttle ? SHUTTLE_FACTOR_HAS : SHUTTLE_FACTOR_NO;
}

/** 计算有效工时 */
export function calculateEffectiveHours(
  input: FreshGradInput,
  officeRatio: number,
  shuttleFactor: number,
): number {
  return (
    input.dailyWorkHours
    + input.commuteHours * shuttleFactor
    - 0.5 * input.restHours
  ) * officeRatio;
}

/** 计算定居期望因子
 *  定居期望系数 = 10年收入 / 新房90㎡首付(30%)
 *  系数 >= 3 → 1.2（定居轻松，加分）
 *  系数 <= 1 → 0.8（定居困难，减分）
 *  1 < 系数 < 3 → 线性插值 0.8 ~ 1.2
 */
export function calcSettlementFactor(annualSalary: number, newhomePrice: number): number {
  if (newhomePrice <= 0) return 1.0;
  // 首付(元) = 单价(万元/㎡) × 10000 × 90㎡ × 30%
  const downPayment = newhomePrice * 10000 * HOUSING_BUY_AREA * HOUSING_DOWN_PAYMENT;
  const coeff = (annualSalary * 10) / downPayment;
  if (coeff >= 3) return 1.2;
  if (coeff <= 1) return 0.8;
  return 0.8 + (coeff - 1) * 0.2;
}

/** ── 居住成本计算（支持外部数据） ── */

interface HousingPrices {
  wholeRentPrice: number;
  sharedRentPrice: number;
  newhomePrice: number;
  secondhandPrice: number;
}

/** 计算指定城市的年居住成本 */
function computeAnnualHousingCost(
  mode: FreshGradInput['housingMode'],
  housing: HousingPrices,
): number {
  switch (mode) {
    case 'whole':
      return housing.wholeRentPrice * HOUSING_WHOLE_RENT_AREA * 12;
    case 'shared':
      return housing.sharedRentPrice * HOUSING_SHARED_RENT_AREA * 12;
    default:
      return 0;
  }
}

/** 计算购房年月供 × 12 = 年居住成本（仅用于定居系数展示） */
export function computeAnnualMortgage(unitPriceWan: number): number {
  const totalPriceWan = unitPriceWan * HOUSING_BUY_AREA;
  const downPayment = totalPriceWan * HOUSING_DOWN_PAYMENT;
  const loanWan = totalPriceWan - downPayment;
  const monthlyPayment = calcMonthlyPayment(loanWan, HOUSING_INTEREST_RATE, HOUSING_LOAN_YEARS);
  return monthlyPayment * 12;
}

/** 从外部数据计算含居住成本的储蓄率归一化基数 */
function computeSavingsAvgFromExternal(allCityData: { income: number; consumption: number; wholeRentPrice: number; sharedRentPrice: number }[]): number {
  let total = 0;
  for (const data of allCityData) {
    const housingCost = data.sharedRentPrice * HOUSING_SHARED_RENT_AREA * 12;
    const savingsRate = (data.income - data.consumption - housingCost) / data.income;
    total += savingsRate;
  }
  return total / allCityData.length;
}

/** 城市储蓄系数分段线性映射：<0→0.6, 0→0.8, 1.5→1.2, >1.5→1.2 */
function mapCitySavings(value: number): number {
  if (value <= 0) return 0.6;
  if (value >= 1.5) return 1.2;
  // 0→0.8, 1.5→1.2 线性插值
  return 0.8 + (value / 1.5) * 0.4;
}

/** 计算环境系数（必须提供 cityData） */
export function calculateEnvFactor(
  input: FreshGradInput,
  cityData: CityCalculationData,
  citySavingsRateAvg: number = 0.3, // 默认归一化基数
  annualSalary: number = 0,
): { value: number; factors: FreshGradResult['envFactors'] } {
  const workEnv = WORK_ENV_FACTOR[input.workEnvironment] ?? 1.0;
  const leader = LEADER_FACTOR[input.leaderRelation] ?? 1.0;
  const colleague = COLLEAGUE_FACTOR[input.colleagueRelation] ?? 1.0;
  const cafeteria = input.hasCafeteria
    ? (CAFETERIA_FACTOR[input.cafeteriaQuality ?? '普通'] ?? 1.0)
    : 1.0;
  const locationPref = LOCATION_PREF_FACTOR[input.locationPreference] ?? 1.0;
  /** 基数系数：基数/月薪 比值分段线性映射 */
  function calcBaseFactor(ratio: number): number {
    if (ratio < 0.5) return 0.8;
    if (ratio <= 0.8) return 1.0;
    if (ratio <= 1.1) return 1.0 + (ratio - 0.8) / (1.1 - 0.8) * 0.1;
    return 1.2;
  }

  const salary = input.monthlyBaseSalary || 1;
  const socialInsuranceFactor = input.hasSocialInsurance === '有'
    ? calcBaseFactor((input.socialInsuranceBase || salary) / salary)
    : 0.8;
  const housingFundFactor = input.hasHousingFund === '有'
    ? calcBaseFactor((input.housingFundBase || salary) / salary)
    : 0.8;
  const extraInsuranceFactor = input.hasExtraInsurance ? 1.1 : 1.0;
  const laborFactor = socialInsuranceFactor * housingFundFactor * extraInsuranceFactor;

  const housingCost = computeAnnualHousingCost(input.housingMode, cityData);
  const savingsRate = (cityData.income - cityData.consumption * 0.7 - housingCost) / cityData.income;
  const rawCitySavings = savingsRate / citySavingsRateAvg;
  // 分段线性映射：<0→0.6, 0→0.8, 1.5→1.2, >1.5→1.2
  const citySavings = mapCitySavings(rawCitySavings);

  const settlement = calcSettlementFactor(annualSalary, cityData.newhomePrice);
  const newhomeDownPayment = cityData.newhomePrice * 10000 * HOUSING_BUY_AREA * HOUSING_DOWN_PAYMENT;

  // ── 平台系数 ──
  const growthVal = GROWTH_FACTOR[input.growthFactor] ?? 1.0;
  const roleCoreVal = ROLE_CORE_FACTOR[input.roleCoreFactor] ?? 1.0;
  const companySizeVal = COMPANY_SIZE_FACTOR[input.companySizeFactor] ?? 1.0;
  const overtimeCultureVal = OVERTIME_CULTURE_FACTOR[input.overtimeCultureFactor] ?? 1.0;
  // 平台系数 = 发展 × 岗位核心 × 公司规模 / 加班文化（加班文化越严重系数越大→放分母→分数越低）
  const platformFactor = growthVal * roleCoreVal * companySizeVal / overtimeCultureVal;

  return {
    value: workEnv * leader * colleague * citySavings * cafeteria * settlement * locationPref * laborFactor * platformFactor,
    factors: {
      workEnv, leader, colleague, cafeteria, citySavings,
      cityIncome: cityData.income,
      cityConsumption: cityData.consumption,
      annualHousingCost: housingCost,
      savingsRate,
      settlement,
      newhomeDownPayment,
      locationPref,
      laborFactor,
      socialInsuranceFactor,
      housingFundFactor,
      extraInsuranceFactor,
      platformFactor,
      growthFactor: growthVal,
      roleCoreFactor: roleCoreVal,
      companySizeFactor: companySizeVal,
      overtimeCultureFactor: overtimeCultureVal,
    },
  };
}

/** 获取评级 */
export function getRating(score: number): RatingInfo {
  for (const { max, info } of RATINGS) {
    if (score < max) return info;
  }
  return RATINGS[RATINGS.length - 1].info;
}

/** 主计算函数（必须提供 cityData） */
export function calculateFreshGradScore(
  input: FreshGradInput,
  cityData: CityCalculationData,
  citySavingsRateAvg: number = 0.3,
): FreshGradResult {
  const tc = calculateTotalCompensation(input);
  const workingDays = calculateWorkingDays(input);
  const dailySalary = calculateDailySalary(tc, workingDays);
  const educationScore = calculateEducationScore(input);
  const { expectedAnnual, expectedDaily, industryAvgSalary, industryFactor } = calculateExpectedSalary(
    educationScore, input.targetCity, input.targetIndustry, cityData.industrySalaries,
  );
  const { value: envFactor, factors: envFactors } = calculateEnvFactor(input, cityData, citySavingsRateAvg, tc);
  const officeRatio = calculateOfficeRatio(input);
  const shuttleFactor = getShuttleFactor(input.hasShuttle);
  const effectiveHours = calculateEffectiveHours(input, officeRatio, shuttleFactor);
  const timeFactor = effectiveHours / STANDARD_HOURS;
  let score = 0;
  if (expectedDaily > 0 && timeFactor > 0) {
    score = (dailySalary * envFactor) / (expectedDaily * timeFactor);
  }
  const rating = getRating(score);
  return {
    score,
    rating,
    workingDays,
    dailySalary,
    totalCompensation: tc,
    expectedAnnualSalary: expectedAnnual,
    expectedDailySalary: expectedDaily,
    educationScore,
    envFactor,
    envFactors,
    timeFactor,
    officeRatio,
    shuttleFactor,
    effectiveHours,
    industryAvgSalary,
    industryFactor,
  };
}

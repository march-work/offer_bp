// ── 应届生评测器核心计算函数 ──
// 公式:FreshGrad Score = (dailySalary × envFactor) / (expectedDailySalary × timeFactor)
// 其中 timeFactor = effectiveHours / 8，归一化到标准8小时工作制

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
  getCityFactor,
  SALARY_PAYMENT_FACTOR,
  GROWTH_FACTOR,
  ROLE_CORE_FACTOR,
  COMPANY_SIZE_FACTOR,
  OVERTIME_CULTURE_FACTOR,
  CAFETERIA_FACTOR,
  LOCATION_PREF_FACTOR,
  RATINGS,
  SHUTTLE_FACTOR_HAS,
  SHUTTLE_FACTOR_NO,
  EDUCATION_WEIGHTS,
  SICK_LEAVE_DISCOUNT,
  REST_TIME_DISCOUNT,
  SETTLEMENT_RATIO_MIN,
  SETTLEMENT_RATIO_MAX,
  SETTLEMENT_FACTOR_MIN,
  SETTLEMENT_FACTOR_MAX,
  CITY_SAVINGS_RAW_MAX,
  CITY_SAVINGS_MIN,
  CITY_SAVINGS_LOW,
  CITY_SAVINGS_MAX,
  BASE_RATIO_LOW,
  BASE_RATIO_MID,
  BASE_RATIO_HIGH,
  BASE_FACTOR_MIN,
  BASE_FACTOR_MAX,
  NO_SOCIAL_INSURANCE_FACTOR,
  NO_HOUSING_FUND_FACTOR,
  EXTRA_INSURANCE_FACTOR,
  CONSUMPTION_DISCOUNT,
  CITY_SAVINGS_RATE_AVG,
  DEFAULT_BUY_AREA,
  DEFAULT_WHOLE_RENT_AREA,
  DEFAULT_SHARED_RENT_AREA,
  DOWN_PAYMENT_RATIO,
  resolveInternalIndustry,
} from './constants';


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
    - (input.annualLeave + input.publicHolidays + input.paidSickLeave * SICK_LEAVE_DISCOUNT)
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
  cityIncome: number,
  industry: string,
  industrySalaries?: Record<string, number>,
): { expectedAnnual: number; expectedDaily: number; industryAvgSalary: number; industryFactor: number; cityFactor: number } {
  const baseWan = scoreToExpectedAnnualWan(educationScore);
  const cityFactor = getCityFactor(cityIncome);
  // 解析为统计局内部行业名（白皮书行业名需映射）
  const internalIndustry = resolveInternalIndustry(industry);
  // 优先使用 JSON 真实行业薪资数据，无数据时回退到 INDUSTRY_FACTOR 兜底表
  let industryFactor = INDUSTRY_FACTOR[internalIndustry] ?? 1.0;
  let industryAvgSalary = 0;
  if (industrySalaries && industrySalaries[internalIndustry]) {
    const salaries = Object.values(industrySalaries) as number[];
    const cityAvg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    industryFactor = industrySalaries[internalIndustry] / cityAvg;
    industryAvgSalary = industrySalaries[internalIndustry];
  }
  const expectedAnnual = baseWan * cityFactor * industryFactor * 10000;
  const expectedDaily = expectedAnnual / STANDARD_WORKING_DAYS;
  return { expectedAnnual, expectedDaily, industryAvgSalary, industryFactor, cityFactor };
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

/** 计算有效工时
 *  公式: workHours − 0.5×rest + commute×shuttle×officeRatio
 *  工作和休息在所有天数（含 WFH）都计算，通勤仅按办公室天数折算
 */
export function calculateEffectiveHours(
  input: FreshGradInput,
  officeRatio: number,
  shuttleFactor: number,
): number {
  return Math.max(0,
    input.dailyWorkHours
    - REST_TIME_DISCOUNT * input.restHours
    + input.commuteHours * shuttleFactor * officeRatio,
  );
}

/** 计算定居期望因子
 *  定居期望系数 = 10年收入 / 新房90㎡首付(30%)
 */
export function calcSettlementFactor(annualSalary: number, newhomePrice: number): number {
  if (newhomePrice <= 0) return 1.0;
  const downPayment = newhomePrice * 10000 * DEFAULT_BUY_AREA * DOWN_PAYMENT_RATIO;
  const coeff = (annualSalary * 10) / downPayment;
  if (coeff >= SETTLEMENT_RATIO_MAX) return SETTLEMENT_FACTOR_MAX;
  if (coeff <= SETTLEMENT_RATIO_MIN) return SETTLEMENT_FACTOR_MIN;
  return SETTLEMENT_FACTOR_MIN + (coeff - SETTLEMENT_RATIO_MIN) * (SETTLEMENT_FACTOR_MAX - SETTLEMENT_FACTOR_MIN) / (SETTLEMENT_RATIO_MAX - SETTLEMENT_RATIO_MIN);
}

/** ── 居住成本计算 ── */

/** 计算指定城市的年居住成本 */
function computeAnnualHousingCost(
  mode: FreshGradInput['housingMode'],
  housing: CityCalculationData,
): number {
  switch (mode) {
    case 'whole':
      return housing.wholeRentPrice * DEFAULT_WHOLE_RENT_AREA * 12;
    case 'shared':
      return housing.sharedRentPrice * DEFAULT_SHARED_RENT_AREA * 12;
    case 'newhome':
    case 'secondhand':
      return 0; // 买房模式不计入年居住成本（用于储蓄率计算）
    default:
      return 0;
  }
}

/** 城市储蓄系数分段线性映射 */
function mapCitySavings(value: number): number {
  if (value <= 0) return CITY_SAVINGS_MIN;
  if (value >= CITY_SAVINGS_RAW_MAX) return CITY_SAVINGS_MAX;
  return CITY_SAVINGS_LOW + (value / CITY_SAVINGS_RAW_MAX) * (CITY_SAVINGS_MAX - CITY_SAVINGS_LOW);
}

/** 计算环境系数（必须提供 cityData） */
export function calculateEnvFactor(
  input: FreshGradInput,
  cityData: CityCalculationData,
  citySavingsRateAvg: number = CITY_SAVINGS_RATE_AVG,
  annualSalary: number = 0,
): { value: number; factors: FreshGradResult['envFactors'] } {
  const workEnv = WORK_ENV_FACTOR[input.workEnvironment] ?? 1.0;
  const cafeteria = input.hasCafeteria
    ? (CAFETERIA_FACTOR[input.cafeteriaQuality ?? '普通'] ?? 1.0)
    : 1.0;
  const locationPref = LOCATION_PREF_FACTOR[input.locationPreference] ?? 1.0;
  /** 基数系数：基数/月薪 比值分段线性映射 */
  function calcBaseFactor(ratio: number): number {
    if (ratio < BASE_RATIO_LOW) return BASE_FACTOR_MIN;
    if (ratio <= BASE_RATIO_MID) return BASE_FACTOR_MIN + (ratio - BASE_RATIO_LOW) / (BASE_RATIO_MID - BASE_RATIO_LOW) * (1.0 - BASE_FACTOR_MIN);
    if (ratio <= BASE_RATIO_HIGH) return 1.0;
    return BASE_FACTOR_MAX;
  }

  const salary = input.monthlyBaseSalary || 1;
  const socialInsuranceFactor = input.hasSocialInsurance === '有'
    ? calcBaseFactor((input.socialInsuranceBase || salary) / salary)
    : input.hasSocialInsurance === '无'
      ? NO_SOCIAL_INSURANCE_FACTOR
      : 1.0;
  const housingFundFactor = input.hasHousingFund === '有'
    ? calcBaseFactor((input.housingFundBase || salary) / salary)
    : input.hasHousingFund === '无'
      ? NO_HOUSING_FUND_FACTOR
      : 1.0;
  const extraInsuranceFactor = input.hasExtraInsurance ? EXTRA_INSURANCE_FACTOR : 1.0;
  const salaryPaymentFactor = SALARY_PAYMENT_FACTOR[input.salaryPaymentTiming] ?? 1.0;
  const laborFactor = socialInsuranceFactor * housingFundFactor * extraInsuranceFactor * salaryPaymentFactor;

  const housingCost = computeAnnualHousingCost(input.housingMode, cityData);
  const savingsRate = (cityData.income - cityData.consumption * CONSUMPTION_DISCOUNT - housingCost) / cityData.income;
  const rawCitySavings = savingsRate / citySavingsRateAvg;
  const citySavings = mapCitySavings(rawCitySavings);

  const settlement = calcSettlementFactor(annualSalary, cityData.newhomePrice);
  const newhomeDownPayment = cityData.newhomePrice * 10000 * DEFAULT_BUY_AREA * DOWN_PAYMENT_RATIO;

  // ── 平台系数 ──
  const growthVal = GROWTH_FACTOR[input.growthFactor] ?? 1.0;
  const roleCoreVal = ROLE_CORE_FACTOR[input.roleCoreFactor] ?? 1.0;
  const companySizeVal = COMPANY_SIZE_FACTOR[input.companySizeFactor] ?? 1.0;
  const overtimeCultureVal = OVERTIME_CULTURE_FACTOR[input.overtimeCultureFactor] ?? 1.0;
  // 平台系数 = 发展 × 岗位核心 × 公司规模 / 加班文化（加班文化越严重系数越大→放分母→分数越低）
  const platformFactor = growthVal * roleCoreVal * companySizeVal / overtimeCultureVal;

  return {
    value: workEnv * citySavings * cafeteria * settlement * locationPref * laborFactor * platformFactor,
    factors: {
      workEnv, cafeteria, citySavings,
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
      salaryPaymentFactor,
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
  citySavingsRateAvg: number = CITY_SAVINGS_RATE_AVG,
  positionRefSalary?: number,
): FreshGradResult {
  const tc = calculateTotalCompensation(input);
  const workingDays = calculateWorkingDays(input);
  const dailySalary = calculateDailySalary(tc, workingDays);
  const educationScore = calculateEducationScore(input);
  const { expectedAnnual, expectedDaily, industryAvgSalary, industryFactor, cityFactor } = calculateExpectedSalary(
    educationScore, cityData.income, input.targetIndustry, cityData.industrySalaries,
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
    cityFactor,
    ...(positionRefSalary ? { positionRefSalary } : {}),
  };
}

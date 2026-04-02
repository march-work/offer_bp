// ── 应届生评测器核心计算函数 ──
// 公式:FreshGrad Score = (dailySalary × envFactor × 8) / (expectedDailySalary × effectiveHours)

import type { FreshGradInput, FreshGradResult, RatingInfo } from './types';
import {
  PPP_FACTOR_CHINA,
  STANDARD_WORKING_DAYS,
  STANDARD_HOURS,
  BACHELOR_OPTIONS,
  MASTER_OPTIONS,
  PHD_OPTIONS,
  SALARY_SCORE_MAP,
  CITY_TO_TIER,
  CITY_SALARY_FACTOR,
  INDUSTRY_FACTOR,
  WORK_ENV_FACTOR,
  LEADER_FACTOR,
  COLLEAGUE_FACTOR,
  CAFETERIA_FACTOR,
  CITY_SAVINGS_RATIO,
  NATIONAL_SAVINGS_RATIO,
  RATINGS,
} from './constants';
import { getIndustryInfo } from './industry-salary';

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

/** 计算标准化日薪 */
export function calculateDailySalary(annualSalary: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return (annualSalary * PPP_FACTOR_CHINA) / workingDays;
}

/** 计算期望日薪 */
export function calculateExpectedSalary(
  educationScore: number,
  city: string,
  industry: string,
): { expectedAnnual: number; expectedDaily: number; industryAvgSalary: number; industryFactor: number } {
  const baseWan = scoreToExpectedAnnualWan(educationScore);
  const cityTier = CITY_TO_TIER[city] ?? '新一线';
  const cityFactor = CITY_SALARY_FACTOR[cityTier] ?? 1.0;
  const { factor: realIndustryFactor, avgSalary } = getIndustryInfo(city, industry);
  // 有真实数据用真实因子，否则回退到通用行业因子
  const industryFactor = avgSalary > 0 ? realIndustryFactor : (INDUSTRY_FACTOR[industry] ?? 1.0);
  const expectedAnnual = baseWan * cityFactor * industryFactor * 10000;
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
    + input.commuteHours * officeRatio * shuttleFactor
    - 0.5 * input.restHours
  );
}

/** 计算环境系数 */
export function calculateEnvFactor(input: FreshGradInput): number {
  const workEnv = WORK_ENV_FACTOR[input.workEnvironment] ?? 1.0;
  const leader = LEADER_FACTOR[input.leaderRelation] ?? 1.0;
  const colleague = COLLEAGUE_FACTOR[input.colleagueRelation] ?? 1.0;
  const citySavings = CITY_SAVINGS_RATIO[input.targetCity] ?? NATIONAL_SAVINGS_RATIO;
  const cafeteria = input.hasCafeteria
    ? (CAFETERIA_FACTOR[input.cafeteriaQuality ?? '普通'] ?? 1.0)
    : 1.0;
  return workEnv * leader * colleague * citySavings * cafeteria;
}

/** 获取评级 */
export function getRating(score: number): RatingInfo {
  for (const { max, info } of RATINGS) {
    if (score < max) return info;
  }
  return RATINGS[RATINGS.length - 1].info;
}

/** 主计算函数 */
export function calculateFreshGradScore(input: FreshGradInput): FreshGradResult {
  const tc = calculateTotalCompensation(input);
  const workingDays = calculateWorkingDays(input);
  const dailySalary = calculateDailySalary(tc, workingDays);
  const educationScore = calculateEducationScore(input);
  const { expectedAnnual, expectedDaily, industryAvgSalary, industryFactor } = calculateExpectedSalary(
    educationScore, input.targetCity, input.targetIndustry,
  );
  const envFactor = calculateEnvFactor(input);
  const officeRatio = calculateOfficeRatio(input);
  const shuttleFactor = getShuttleFactor(input.hasShuttle);
  const effectiveHours = calculateEffectiveHours(input, officeRatio, shuttleFactor);
  let score = 0;
  if (expectedDaily > 0 && effectiveHours > 0) {
    score = (dailySalary * envFactor * STANDARD_HOURS) / (expectedDaily * effectiveHours);
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
    effectiveHours,
    officeRatio,
    shuttleFactor,
    industryAvgSalary,
    industryFactor,
  };
}

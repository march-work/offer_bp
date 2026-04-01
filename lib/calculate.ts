// ── 应届生评测器核心计算函数 ──
// 公式：FreshGrad Score = (dailySalary × envFactor × 8) / (expectedDailySalary × effectiveHours)

import type { FreshGradInput, FreshGradResult, RatingInfo } from './types';
import {
  PPP_FACTOR_CHINA,
  STANDARD_WORKING_DAYS,
  STANDARD_HOURS,
  BASE_ANNUAL_SALARY,
  CITY_SALARY_FACTOR,
  INDUSTRY_FACTOR,
  INDUSTRY_BONUS_MONTHS,
  CITY_LIVING_COST,
  WORK_ENV_FACTOR,
  LEADER_FACTOR,
  COLLEAGUE_FACTOR,
  CAFETERIA_FACTOR,
  RATINGS,
} from './constants';

const SHUTTLE_FACTOR_HAS = 0.3;
const SHUTTLE_FACTOR_NO = 1.0;

/** 计算年总包 TC */
export function calculateTotalCompensation(input: FreshGradInput): number {
  return (
    input.monthlyBaseSalary * 12
    + input.monthlyBaseSalary * input.bonusMonths
    + input.annualStock * 10000
    + input.monthlyAllowance * 12
  );
}

/** 计算年工作日数 */
export function calculateWorkingDays(input: FreshGradInput): number {
  return (
    52 * input.workDaysPerWeek -
    (input.annualLeave + input.publicHolidays + input.paidSickLeave * 0.6)
  );
}

/** 计算标准化日薪 */
export function calculateDailySalary(annualSalary: number, workingDays: number): number {
  if (workingDays <= 0) return 0;
  return (annualSalary * PPP_FACTOR_CHINA) / workingDays;
}

/** 计算期望日薪 */
export function calculateExpectedDailySalary(
  education: string,
  schoolLevel: string,
  cityTier: string,
  industry: string,
): { expectedAnnual: number; expectedDaily: number } {
  const key = `${education}|${schoolLevel}`;
  const baseSalaryWan = BASE_ANNUAL_SALARY[key] ?? 8;
  const cityFactor = CITY_SALARY_FACTOR[cityTier] ?? 1.0;
  const industryFactor = INDUSTRY_FACTOR[industry] ?? 0.85;

  const expectedAnnual = baseSalaryWan * cityFactor * industryFactor * 10000;
  const expectedDaily = expectedAnnual / STANDARD_WORKING_DAYS;
  return { expectedAnnual, expectedDaily };
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
    input.dailyWorkHours +
    input.commuteHours * officeRatio * shuttleFactor -
    0.5 * input.restHours
  );
}

/** 计算环境系数 */
export function calculateEnvFactor(input: FreshGradInput): number {
  const workEnv = WORK_ENV_FACTOR[input.workEnvironment] ?? 1.0;
  const leader = LEADER_FACTOR[input.leaderRelation] ?? 1.0;
  const colleague = COLLEAGUE_FACTOR[input.colleagueRelation] ?? 1.0;
  const cityLiving = CITY_LIVING_COST[input.cityLevel] ?? 1.0;
  const cafeteria = input.hasCafeteria
    ? (CAFETERIA_FACTOR[input.cafeteriaQuality ?? '普通'] ?? 1.0)
    : 1.0;

  return workEnv * leader * colleague * cityLiving * cafeteria;
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

  const { expectedAnnual, expectedDaily } = calculateExpectedDailySalary(
    input.education, input.schoolLevel, input.targetCity, input.targetIndustry,
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
    score, rating, workingDays, dailySalary,
    totalCompensation: tc,
    expectedAnnualSalary: expectedAnnual,
    expectedDailySalary: expectedDaily,
    envFactor, effectiveHours, officeRatio, shuttleFactor,
  };
}

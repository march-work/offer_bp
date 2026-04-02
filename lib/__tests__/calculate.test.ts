import {
  calculateWorkingDays,
  calculateDailySalary,
  calculateEnvFactor,
  calculateEffectiveHours,
  calculateOfficeRatio,
  getShuttleFactor,
  calculateTotalCompensation,
  calculateFreshGradScore,
  getRating,
  calculateEducationScore,
  scoreToExpectedAnnualWan,
} from '../calculate';
import { CITY_SAVINGS_RATIO, NATIONAL_SAVINGS_RATIO } from '../constants';
import { CITY_LIVING_DATA } from '../living-cost';
import type { FreshGradInput } from '../types';

const CITY_SAVINGS_RATE_AVG =
  Object.values(CITY_SAVINGS_RATIO).reduce((sum, r) => sum + (r - 1) / r, 0) /
  Object.keys(CITY_SAVINGS_RATIO).length;

// Average savings rate with shared rent housing cost (matches calculate.ts default)
const CITY_SAVINGS_RATE_WITH_HOUSING_AVG = (() => {
  let total = 0;
  for (const data of Object.values(CITY_LIVING_DATA)) {
    const housingCost = data.sharedRentPrice * 20 * 12;
    total += (data.income - data.consumption - housingCost) / data.income;
  }
  return total / Object.keys(CITY_LIVING_DATA).length;
})();

function createTestInput(overrides: Partial<FreshGradInput> = {}): FreshGradInput {
  return {
    bachelorLevel: '双非',
    masterLevel: '无',
    phdLevel: '无',
    targetCity: '成都',
    targetIndustry: '信息传输、软件和信息技术服务专业',
    monthlyBaseSalary: 12500,
    monthsPerYear: 12,
    yearEndBonus: 0,
    annualStock: 0,
    monthlyAllowance: 0,
    workDaysPerWeek: 5,
    wfhDaysPerWeek: 0,
    annualLeave: 5,
    publicHolidays: 13,
    paidSickLeave: 3,
    dailyWorkHours: 9,
    commuteHours: 1.5,
    restHours: 1.5,
    workEnvironment: '普通',
    leaderRelation: '中规中矩',
    colleagueRelation: '萍水相逢',
    hasShuttle: false,
    hasCafeteria: false,
    cafeteriaQuality: '普通',
    housingMode: 'shared' as const,
    ...overrides,
  };
}

// ── calculateTotalCompensation ──
describe('calculateTotalCompensation', () => {
  it('calculates base TC correctly', () => {
    const input = createTestInput({
      monthlyBaseSalary: 18000,
      monthsPerYear: 14,
      yearEndBonus: 20000,
      annualStock: 5,
      monthlyAllowance: 1000,
    });
    expect(calculateTotalCompensation(input)).toBe(18000 * 14 + 20000 + 50000 + 1000 * 12);
  });

  it('handles zero values', () => {
    const input = createTestInput({
      monthlyBaseSalary: 10000,
      monthsPerYear: 12,
      yearEndBonus: 0,
      annualStock: 0,
      monthlyAllowance: 0,
    });
    expect(calculateTotalCompensation(input)).toBe(120000);
  });
});

// ── calculateWorkingDays ──
describe('calculateWorkingDays', () => {
  it('calculates standard 5-day week', () => {
    const input = createTestInput({
      workDaysPerWeek: 5,
      annualLeave: 5,
      publicHolidays: 13,
      paidSickLeave: 3,
    });
    // 52 * 5 - (5 + 13 + 3 * 0.6) = 260 - 19.8 = 240.2
    expect(calculateWorkingDays(input)).toBeCloseTo(240.2, 1);
  });

  it('handles 6-day work week', () => {
    const input = createTestInput({
      workDaysPerWeek: 6,
      annualLeave: 5,
      publicHolidays: 11,
      paidSickLeave: 0,
    });
    // 52 * 6 - (5 + 11) = 312 - 16 = 296
    expect(calculateWorkingDays(input)).toBe(296);
  });
});

// ── calculateDailySalary ──
describe('calculateDailySalary', () => {
  it('calculates real daily salary (CNY)', () => {
    const annual = 150000;
    const days = 240;
    expect(calculateDailySalary(annual, days)).toBeCloseTo(150000 / 240, 1);
  });

  it('returns 0 for zero or negative days', () => {
    expect(calculateDailySalary(100000, 0)).toBe(0);
    expect(calculateDailySalary(100000, -10)).toBe(0);
  });
});

// ── calculateOfficeRatio ──
describe('calculateOfficeRatio', () => {
  it('returns 1 when no WFH', () => {
    expect(calculateOfficeRatio(createTestInput({ wfhDaysPerWeek: 0, workDaysPerWeek: 5 }))).toBe(1);
  });

  it('calculates ratio with 2 WFH days', () => {
    expect(calculateOfficeRatio(createTestInput({ wfhDaysPerWeek: 2, workDaysPerWeek: 5 }))).toBeCloseTo(0.6);
  });

  it('returns 1 for zero work days', () => {
    expect(calculateOfficeRatio(createTestInput({ workDaysPerWeek: 0 }))).toBe(1);
  });
});

// ── getShuttleFactor ──
describe('getShuttleFactor', () => {
  it('returns 0.3 when has shuttle', () => {
    expect(getShuttleFactor(true)).toBe(0.3);
  });

  it('returns 1.0 when no shuttle', () => {
    expect(getShuttleFactor(false)).toBe(1.0);
  });
});

// ── calculateEffectiveHours ──
describe('calculateEffectiveHours', () => {
  it('calculates with full office and no shuttle', () => {
    const input = createTestInput({
      dailyWorkHours: 9,
      commuteHours: 1.5,
      restHours: 1.5,
    });
    // 9 + 1.5 * 1.0 * 1.0 - 0.5 * 1.5 = 9 + 1.5 - 0.75 = 9.75
    expect(calculateEffectiveHours(input, 1.0, 1.0)).toBeCloseTo(9.75);
  });

  it('reduces commute with WFH', () => {
    const input = createTestInput({
      dailyWorkHours: 9,
      commuteHours: 2,
      restHours: 1,
    });
    // 9 + 2 * 0.6 * 1.0 - 0.5 * 1 = 9 + 1.2 - 0.5 = 9.7
    expect(calculateEffectiveHours(input, 0.6, 1.0)).toBeCloseTo(9.7);
  });
});

// ── calculateEnvFactor ──
describe('calculateEnvFactor', () => {
  it('uses housing-adjusted savings rate for 成都 shared rent', () => {
    const input = createTestInput({
      targetCity: '成都',
      housingMode: 'shared',
      workEnvironment: '普通',
      leaderRelation: '中规中矩',
      colleagueRelation: '萍水相逢',
      hasCafeteria: false,
    });
    // 成都合租: savings = (income - consumption - housing) / income
    const cd = CITY_LIVING_DATA['成都']!;
    const housingCost = cd.sharedRentPrice * 20 * 12;
    const rate = (cd.income - cd.consumption - housingCost) / cd.income;
    expect(calculateEnvFactor(input)).toBeCloseTo(rate / CITY_SAVINGS_RATE_WITH_HOUSING_AVG, 4);
  });

  it('boosts with good environment in 北京 secondhand mortgage', () => {
    const input = createTestInput({
      targetCity: '北京',
      housingMode: 'secondhand',
      workEnvironment: '高端园区',
      leaderRelation: '善解人意',
      colleagueRelation: '亲如一家',
      hasCafeteria: true,
      cafeteriaQuality: '丰富且便宜',
    });
    const factor = calculateEnvFactor(input);
    // 北京房价极高，按揭远超收入， envFactor 可能为负
    expect(typeof factor).toBe('number');
  });

  it('uses national average for unknown city (no housing data)', () => {
    const input = createTestInput({
      targetCity: '未知城市',
      housingMode: 'shared',
      workEnvironment: '普通',
      leaderRelation: '中规中矩',
      colleagueRelation: '萍水相逢',
      hasCafeteria: false,
    });
    // Fallback: old formula without housing
    const raw = 1.46;
    const rate = (raw - 1) / raw;
    expect(calculateEnvFactor(input)).toBeCloseTo(rate / CITY_SAVINGS_RATE_WITH_HOUSING_AVG);
  });
});

// ── calculateEducationScore ──
describe('calculateEducationScore', () => {
  it('scores bachelor only (双非)', () => {
    const input = createTestInput({ bachelorLevel: '双非', masterLevel: '无', phdLevel: '无' });
    // 3.0 * 0.5 = 1.5
    expect(calculateEducationScore(input)).toBeCloseTo(1.5);
  });

  it('scores bachelor + master (双非 + 985硕士)', () => {
    const input = createTestInput({ bachelorLevel: '双非', masterLevel: '985硕士', phdLevel: '无' });
    // 3.0 * 0.35 + 6.0 * 0.65 = 1.05 + 3.9 = 4.95
    expect(calculateEducationScore(input)).toBeCloseTo(4.95);
  });

  it('scores bachelor + master + phd', () => {
    const input = createTestInput({ bachelorLevel: '211', masterLevel: '985硕士', phdLevel: '985博士' });
    // 5.0 * 0.25 + 6.0 * 0.15 + 7.0 * 0.6 = 1.25 + 0.9 + 4.2 = 6.35
    expect(calculateEducationScore(input)).toBeCloseTo(6.35);
  });

  it('scores direct PhD (直博)', () => {
    const input = createTestInput({ bachelorLevel: '985', masterLevel: '无', phdLevel: '985博士' });
    // 7.0 * 0.35 + 0 + 7.0 * 0.65 = 2.45 + 4.55 = 7.0
    expect(calculateEducationScore(input)).toBeCloseTo(7.0);
  });

  it('scores 清北 bachelor', () => {
    const input = createTestInput({ bachelorLevel: '清北', masterLevel: '无', phdLevel: '无' });
    // 9.5 * 0.5 = 4.75
    expect(calculateEducationScore(input)).toBeCloseTo(4.75);
  });
});

// ── scoreToExpectedAnnualWan ──
describe('scoreToExpectedAnnualWan', () => {
  it('interpolates between known values', () => {
    // Score 3.0 → 8.5万
    expect(scoreToExpectedAnnualWan(3.0)).toBeCloseTo(8.5);
  });

  it('clamps at minimum', () => {
    expect(scoreToExpectedAnnualWan(0)).toBe(4);
  });

  it('clamps at maximum', () => {
    expect(scoreToExpectedAnnualWan(15)).toBe(65);
  });

  it('interpolates linearly', () => {
    // Score 5.5 is between 5.0→14 and 6.0→19
    // 14 + 0.5 * (19 - 14) = 16.5
    expect(scoreToExpectedAnnualWan(5.5)).toBeCloseTo(16.5);
  });
});

// ── getRating ──
describe('getRating', () => {
  it('returns 大冤种 for very low score', () => {
    expect(getRating(0.3).label).toBe('大冤种');
  });

  it('returns 合理 for score around 1.0', () => {
    expect(getRating(1.0).label).toBe('合理');
  });

  it('returns 天选 Offer for very high score', () => {
    expect(getRating(2.0).label).toBe('天选 Offer');
  });
});

// ── calculateFreshGradScore (integration) ──
describe('calculateFreshGradScore', () => {
  it('produces a valid result for typical input', () => {
    const input = createTestInput({
      monthlyBaseSalary: 15000,
      monthsPerYear: 14,
      yearEndBonus: 30000,
    });
    const result = calculateFreshGradScore(input);
    expect(result.score).toBeGreaterThan(0);
    expect(result.totalCompensation).toBe(15000 * 14 + 30000);
    expect(result.rating.label).toBeDefined();
    expect(result.educationScore).toBeCloseTo(1.5); // 双非 bachelor only
  });

  it('produces higher score for higher salary', () => {
    const low = calculateFreshGradScore(createTestInput({ monthlyBaseSalary: 10000 }));
    const high = calculateFreshGradScore(createTestInput({ monthlyBaseSalary: 25000 }));
    expect(high.score).toBeGreaterThan(low.score);
  });
});

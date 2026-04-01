import {
  calculateWorkingDays,
  calculateDailySalary,
  calculateExpectedDailySalary,
  calculateEnvFactor,
  calculateEffectiveHours,
  calculateOfficeRatio,
  getShuttleFactor,
  calculateTotalCompensation,
  calculateFreshGradScore,
  getRating,
} from '../calculate';
import type { FreshGradInput } from '../types';

function createTestInput(overrides: Partial<FreshGradInput> = {}): FreshGradInput {
  return {
    education: '本科',
    schoolLevel: '双非一本',
    targetCity: '新一线',
    targetIndustry: '互联网/软件',
    monthlyBaseSalary: 12500,
    bonusMonths: 0,
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
    cityLevel: '新一线',
    hasShuttle: false,
    hasCafeteria: false,
    cafeteriaQuality: '普通',
    ...overrides,
  };
}

describe('calculateTotalCompensation', () => {
  it('基础月薪×12 = TC', () => {
    const input = createTestInput({ monthlyBaseSalary: 15000, bonusMonths: 0, annualStock: 0, monthlyAllowance: 0 });
    expect(calculateTotalCompensation(input)).toBe(180000);
  });

  it('月薪×(12+3) = 15薪', () => {
    const input = createTestInput({ monthlyBaseSalary: 15000, bonusMonths: 3, annualStock: 0, monthlyAllowance: 0 });
    expect(calculateTotalCompensation(input)).toBe(225000);
  });

  it('含股票和补贴', () => {
    const input = createTestInput({
      monthlyBaseSalary: 18000, bonusMonths: 3,
      annualStock: 5, monthlyAllowance: 1500,
    });
    // 18000×12 + 18000×3 + 50000 + 1500×12 = 216000 + 54000 + 50000 + 18000 = 338000
    expect(calculateTotalCompensation(input)).toBe(338000);
  });

  it('全部为零返回 0', () => {
    const input = createTestInput({
      monthlyBaseSalary: 0, bonusMonths: 0, annualStock: 0, monthlyAllowance: 0,
    });
    expect(calculateTotalCompensation(input)).toBe(0);
  });
});

describe('calculateWorkingDays', () => {
  it('文档示例: 5天/周, 5天年假, 13天法定假日, 3天病假', () => {
    const input = createTestInput();
    // 52 × 5 - (5 + 13 + 3 × 0.6) = 260 - 19.8 = 240.2
    expect(calculateWorkingDays(input)).toBeCloseTo(240.2, 1);
  });

  it('无假期时 = 260天', () => {
    const input = createTestInput({
      annualLeave: 0, publicHolidays: 0, paidSickLeave: 0,
    });
    expect(calculateWorkingDays(input)).toBe(260);
  });
});

describe('calculateDailySalary', () => {
  it('22万年薪, 240天', () => {
    const daily = calculateDailySalary(220000, 240.2);
    // (220000 × 4.19) / 240.2 ≈ 3837.6
    expect(daily).toBeCloseTo(3837.6, 0);
  });

  it('零工作日返回 0', () => {
    expect(calculateDailySalary(200000, 0)).toBe(0);
  });
});

describe('calculateExpectedDailySalary', () => {
  it('985本科 + 新一线 + 互联网', () => {
    const result = calculateExpectedDailySalary('本科', '985/211', '新一线', '互联网/软件');
    // 15万 × 1.0 × 1.2 = 18万
    expect(result.expectedAnnual).toBeCloseTo(180000, -3);
    expect(result.expectedDaily).toBeCloseTo(692.31, 0);
  });

  it('C9博士 + 超一线 + AI', () => {
    const result = calculateExpectedDailySalary('博士', 'C9/清北', '超一线', 'AI/大模型');
    // 45万 × 1.3 × 1.4 = 81.9万
    expect(result.expectedAnnual).toBeCloseTo(819000, -3);
  });
});

describe('calculateEnvFactor', () => {
  it('默认环境 = 0.80', () => {
    const input = createTestInput();
    // 1.0 × 1.0 × 1.0 × 0.80 × 1.0 = 0.80
    expect(calculateEnvFactor(input)).toBeCloseTo(0.80, 3);
  });

  it('CBD + 善解人意 + 和睦 + 新一线 + 无食堂', () => {
    const input = createTestInput({
      workEnvironment: 'CBD/甲级写字楼',
      leaderRelation: '善解人意',
      colleagueRelation: '和和睦睦',
      cityLevel: '新一线',
      hasCafeteria: false,
    });
    // 1.1 × 1.2 × 1.1 × 0.80 × 1.0 = 1.1616
    expect(calculateEnvFactor(input)).toBeCloseTo(1.1616, 3);
  });

  it('最差环境', () => {
    const input = createTestInput({
      workEnvironment: '条件较差',
      leaderRelation: '简直噩梦',
      colleagueRelation: '乌烟瘴气',
      cityLevel: '超一线',
      hasCafeteria: false,
    });
    // 0.8 × 0.8 × 0.8 × 0.60 × 1.0 = 0.3072
    expect(calculateEnvFactor(input)).toBeCloseTo(0.3072, 3);
  });
});

describe('calculateEffectiveHours', () => {
  it('标准: 9h工时, 1.5h通勤, 全勤, 无班车', () => {
    const input = createTestInput();
    const officeRatio = calculateOfficeRatio(input);
    expect(officeRatio).toBe(1.0);
    const hours = calculateEffectiveHours(input, officeRatio, getShuttleFactor(false));
    // 9 + 1.5*1.0*1.0 - 0.5*1.5 = 9 + 1.5 - 0.75 = 9.75
    expect(hours).toBeCloseTo(9.75, 2);
  });

  it('WFH 2天减少通勤', () => {
    const input = createTestInput({
      wfhDaysPerWeek: 2,
      dailyWorkHours: 10,
    });
    const officeRatio = calculateOfficeRatio(input);
    expect(officeRatio).toBeCloseTo(0.6, 2);
    const hours = calculateEffectiveHours(input, officeRatio, 1.0);
    // 10 + 1.5 × 0.6 - 0.5 × 1.5 = 10 + 0.9 - 0.75 = 10.15
    expect(hours).toBeCloseTo(10.15, 2);
  });

  it('有班车减少通勤', () => {
    const input = createTestInput({
      dailyWorkHours: 9,
      commuteHours: 2,
      hasShuttle: true,
      restHours: 1,
    });
    const hours = calculateEffectiveHours(input, 1.0, getShuttleFactor(true));
    // 9 + 2 × 1.0 × 0.3 - 0.5 × 1 = 9.1
    expect(hours).toBeCloseTo(9.1, 2);
  });
});

describe('calculateFreshGradScore (完整流程)', () => {
  it('文档验证用例: 成都 985 本科 + 互联网 + 22 万 TC', () => {
    // TC = 22 万 = 18000×12 + 18000×(22/18 - 1) ≈ 简化: 15000*12 + 15000*2.67 = 220000
    // 用 18000×12 + 800 = 216800, 接近 22 万。直接设 monthlyBaseSalary + bonusMonths 凑 220000
    // 18k×12=216000, 还差4000, bonusMonths=4000/18000≈0.22, 算了直接 monthlyBaseSalary=18333 × 12 ≈ 220000
    const input = createTestInput({
      education: '本科',
      schoolLevel: '985/211',
      targetCity: '新一线',
      targetIndustry: '互联网/软件',
      monthlyBaseSalary: 18333,
      bonusMonths: 0,
      annualStock: 0,
      monthlyAllowance: 0,
      commuteHours: 1,
      restHours: 1.5,
      workEnvironment: 'CBD/甲级写字楼',
      leaderRelation: '善解人意',
      colleagueRelation: '和和睦睦',
      cityLevel: '新一线',
    });

    const result = calculateFreshGradScore(input);

    expect(result.workingDays).toBeCloseTo(240.2, 1);
    // TC ≈ 18333 × 12 = 219996 ≈ 220000
    expect(result.totalCompensation).toBeCloseTo(220000, -2);
    expect(result.expectedAnnualSalary).toBeCloseTo(180000, -3);
    expect(result.envFactor).toBeCloseTo(1.1616, 3);
    // 9 + 1*1.0*1.0 - 0.5*1.5 = 9.25
    expect(result.effectiveHours).toBeCloseTo(9.25, 2);
    expect(result.score).toBeGreaterThan(5);
    expect(result.rating.label).toBe('天选 Offer');
  });

  it('996 vs 955 工时对比', () => {
    const base = createTestInput({
      education: '本科', schoolLevel: '985/211',
      targetCity: '新一线', targetIndustry: '互联网/软件',
      monthlyBaseSalary: 15000, bonusMonths: 2.67, // ~22万
      annualStock: 0, monthlyAllowance: 0,
      workEnvironment: 'CBD/甲级写字楼',
      leaderRelation: '善解人意', colleagueRelation: '和和睦睦',
      cityLevel: '新一线', commuteHours: 1,
    });

    const good = calculateFreshGradScore({ ...base, dailyWorkHours: 9, restHours: 1.5 });
    const bad = calculateFreshGradScore({ ...base, dailyWorkHours: 12, restHours: 1 });

    expect(bad.score).toBeLessThan(good.score);
    expect(bad.effectiveHours).toBeGreaterThan(good.effectiveHours);
  });

  it('TC 为 0 得分为 0', () => {
    const result = calculateFreshGradScore(createTestInput({
      monthlyBaseSalary: 0, bonusMonths: 0, annualStock: 0, monthlyAllowance: 0,
    }));
    expect(result.score).toBe(0);
  });

  it('totalCompensation is included in result', () => {
    const input = createTestInput({
      monthlyBaseSalary: 18000, bonusMonths: 3,
      annualStock: 5, monthlyAllowance: 1500,
    });
    const result = calculateFreshGradScore(input);
    expect(result.totalCompensation).toBe(338000);
  });
});

describe('getRating', () => {
  it('各评级边界', () => {
    expect(getRating(0.3).label).toBe('大冤种');
    expect(getRating(0.6).label).toBe('偏低');
    expect(getRating(0.8).label).toBe('一般');
    expect(getRating(1.0).label).toBe('合理');
    expect(getRating(1.2).label).toBe('不错');
    expect(getRating(1.5).label).toBe('很香');
    expect(getRating(2.0).label).toBe('天选 Offer');
  });
});

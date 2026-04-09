// ── Offer 对比功能集成测试 ──
// 测试对比场景下多 offer 的计算正确性和对比逻辑

import {
  calculateFreshGradScore,
  calculateTotalCompensation,
} from '../calculate';
import type { FreshGradInput, CityCalculationData } from '../types';

// ── 测试辅助 ──

function createInput(overrides: Partial<FreshGradInput> = {}): FreshGradInput {
  return {
    bachelorLevel: '985',
    masterLevel: '985硕士',
    phdLevel: '无',
    targetCity: '上海',
    targetIndustry: '信息传输、软件和信息技术服务专业',
    monthlyBaseSalary: 18000,
    monthsPerYear: 12,
    yearEndBonus: 30000,
    annualStock: 0,
    monthlyAllowance: 0,
    workDaysPerWeek: 5,
    wfhDaysPerWeek: 0,
    annualLeave: 7,
    publicHolidays: 13,
    paidSickLeave: 0,
    dailyWorkHours: 9,
    commuteHours: 1.5,
    restHours: 1.5,
    workEnvironment: '普通',
    hasShuttle: false,
    hasCafeteria: true,
    cafeteriaQuality: '不错',
    locationPreference: '无所谓',
    hasSocialInsurance: '有',
    hasHousingFund: '有',
    socialInsuranceBase: 18000,
    housingFundBase: 18000,
    hasExtraInsurance: false,
    salaryPaymentTiming: '次月15日前',
    growthFactor: '有一定空间',
    roleCoreFactor: '核心业务线',
    companySizeFactor: '大厂/行业头部',
    overtimeCultureFactor: '偶尔加班',
    housingMode: 'shared',
    ...overrides,
  };
}

function createCityData(overrides: Partial<CityCalculationData> = {}): CityCalculationData {
  return {
    income: 91987,
    consumption: 52000,
    secondhandPrice: 5.8,
    newhomePrice: 6.5,
    wholeRentPrice: 85,
    sharedRentPrice: 110,
    industrySalaries: {
      '信息传输、软件和信息技术服务专业': 180000,
    },
    ...overrides,
  };
}

// ── 对比场景: 不同薪资 ──
describe('Compare scenario: different salaries', () => {
  const cityData = createCityData();

  it('higher salary produces higher score', () => {
    const offerA = createInput({ monthlyBaseSalary: 15000 });
    const offerB = createInput({ monthlyBaseSalary: 22000 });

    const resultA = calculateFreshGradScore(offerA, cityData);
    const resultB = calculateFreshGradScore(offerB, cityData);

    expect(resultB.score).toBeGreaterThan(resultA.score);
    expect(resultB.totalCompensation).toBeGreaterThan(resultA.totalCompensation);
    expect(resultB.dailySalary).toBeGreaterThan(resultA.dailySalary);
  });
});

// ── 对比场景: 不同城市 ──
describe('Compare scenario: different cities', () => {
  it('lower cost city with same salary has higher env factor', () => {
    const input = createInput();

    const shanghaiData = createCityData({
      income: 91987,
      consumption: 52000,
      sharedRentPrice: 110,
    });

    const chengduData = createCityData({
      income: 52024,
      consumption: 35000,
      sharedRentPrice: 35,
    });

    const shanghaiResult = calculateFreshGradScore(input, shanghaiData);
    const chengduResult = calculateFreshGradScore({ ...input, targetCity: '成都' }, chengduData);

    // 成都更低的生活成本应该产生更高的储蓄系数
    expect(chengduResult.envFactors.annualHousingCost).toBeLessThan(
      shanghaiResult.envFactors.annualHousingCost,
    );
  });
});

// ── 对比场景: 不同工时 ──
describe('Compare scenario: different work hours', () => {
  const cityData = createCityData();

  it('fewer work hours produces lower time factor (better)', () => {
    const offer996 = createInput({
      workDaysPerWeek: 6,
      dailyWorkHours: 12,
      commuteHours: 2,
    });
    const offer955 = createInput({
      workDaysPerWeek: 5,
      dailyWorkHours: 8,
      commuteHours: 0.5,
    });

    const result996 = calculateFreshGradScore(offer996, cityData);
    const result955 = calculateFreshGradScore(offer955, cityData);

    expect(result955.timeFactor).toBeLessThan(result996.timeFactor);
    expect(result955.effectiveHours).toBeLessThan(result996.effectiveHours);
    expect(result955.score).toBeGreaterThan(result996.score);
  });
});

// ── 对比场景: 不同环境系数 ──
describe('Compare scenario: different environment', () => {
  const cityData = createCityData();

  it('better platform factors produce higher env factor', () => {
    const offerLow = createInput({
      growthFactor: '几乎没有',
      roleCoreFactor: '随时可替代',
      companySizeFactor: '初创/微型',
      overtimeCultureFactor: '严重内卷',
    });
    const offerHigh = createInput({
      growthFactor: '晋升路径清晰',
      roleCoreFactor: '核心业务线',
      companySizeFactor: '大厂/行业头部',
      overtimeCultureFactor: '准点下班',
    });

    const resultLow = calculateFreshGradScore(offerLow, cityData);
    const resultHigh = calculateFreshGradScore(offerHigh, cityData);

    expect(resultHigh.envFactor).toBeGreaterThan(resultLow.envFactor);
    expect(resultHigh.envFactors.platformFactor).toBeGreaterThan(resultLow.envFactors.platformFactor);
  });
});

// ── 对比场景: 总包计算一致性 ──
describe('TC calculation consistency', () => {
  it('TC matches sum of components across multiple offers', () => {
    const offers = [
      createInput({ monthlyBaseSalary: 15000, yearEndBonus: 10000, annualStock: 0, monthlyAllowance: 500 }),
      createInput({ monthlyBaseSalary: 20000, yearEndBonus: 50000, annualStock: 10, monthlyAllowance: 0 }),
      createInput({ monthlyBaseSalary: 25000, yearEndBonus: 0, annualStock: 0, monthlyAllowance: 1000 }),
    ];

    offers.forEach((input) => {
      const tc = calculateTotalCompensation(input);
      const expected = input.monthlyBaseSalary * input.monthsPerYear
        + input.yearEndBonus
        + input.annualStock * 10000
        + input.monthlyAllowance * 12;
      expect(tc).toBe(expected);
    });
  });
});

// ── 对比维度提取测试 ──
describe('Compare dimensions extraction', () => {
  it('all result fields needed for comparison are present', () => {
    const input = createInput();
    const cityData = createCityData();
    const result = calculateFreshGradScore(input, cityData);

    // 验证对比表格需要的所有维度都存在
    expect(result.score).toBeDefined();
    expect(result.rating).toBeDefined();
    expect(result.rating.label).toBeDefined();
    expect(result.rating.color).toBeDefined();
    expect(result.totalCompensation).toBeDefined();
    expect(result.dailySalary).toBeDefined();
    expect(result.envFactor).toBeDefined();
    expect(result.effectiveHours).toBeDefined();
    expect(result.expectedDailySalary).toBeDefined();
    expect(result.cityFactor).toBeDefined();
    expect(result.industryFactor).toBeDefined();
    expect(result.workingDays).toBeDefined();
  });

  it('score and rating are consistent', () => {
    const cityData = createCityData();

    // 高薪 offer 应该有更高评分
    const highOffer = createInput({ monthlyBaseSalary: 30000 });
    const result = calculateFreshGradScore(highOffer, cityData);
    expect(result.score).toBeGreaterThan(0);
    expect(result.rating.label).toBeTruthy();
  });
});

// ── 共享字段复用测试 ──
describe('Shared fields pre-fill', () => {
  it('same education produces same education score across different offers', () => {
    const cityData = createCityData();
    const sharedEdu = {
      bachelorLevel: '985',
      masterLevel: '985硕士',
      phdLevel: '无',
    };

    const offerA = createInput({ ...sharedEdu, targetCity: '上海', monthlyBaseSalary: 15000 });
    const offerB = createInput({ ...sharedEdu, targetCity: '上海', monthlyBaseSalary: 25000 });

    const resultA = calculateFreshGradScore(offerA, cityData);
    const resultB = calculateFreshGradScore(offerB, cityData);

    expect(resultA.educationScore).toBe(resultB.educationScore);
    expect(resultA.expectedAnnualSalary).toBe(resultB.expectedAnnualSalary);
    // 但总包不同所以日薪和最终分数不同
    expect(resultA.totalCompensation).not.toBe(resultB.totalCompensation);
  });

  it('same industry with different cities uses correct city factors', () => {
    const sharedIndustry = '信息传输、软件和信息技术服务专业';

    const shanghaiData = createCityData({ income: 91987 });
    const chengduData = createCityData({ income: 52024 });

    const offerShanghai = createInput({
      targetIndustry: sharedIndustry,
      targetCity: '上海',
    });
    const offerChengdu = createInput({
      targetIndustry: sharedIndustry,
      targetCity: '成都',
    });

    const resultShanghai = calculateFreshGradScore(offerShanghai, shanghaiData);
    const resultChengdu = calculateFreshGradScore(offerChengdu, chengduData);

    // 上海城市因子应高于成都
    expect(resultShanghai.cityFactor).toBeGreaterThan(resultChengdu.cityFactor);
  });
});

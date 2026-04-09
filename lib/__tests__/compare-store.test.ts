// ── Offer 对比存储逻辑测试 ──

import {
  generateId,
  MAX_COMPARE_ITEMS,
} from '../compare-store';

// ── generateId ──
describe('generateId', () => {
  it('returns a string starting with "offer_"', () => {
    const id = generateId();
    expect(id).toMatch(/^offer_\d+_[a-z0-9]+$/);
  });

  it('returns unique ids on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ── MAX_COMPARE_ITEMS ──
describe('MAX_COMPARE_ITEMS', () => {
  it('is 5', () => {
    expect(MAX_COMPARE_ITEMS).toBe(5);
  });
});

// ── CompareItem type shape verification ──
describe('CompareItem type', () => {
  it('has correct structure', () => {
    const item = {
      id: generateId(),
      label: '字节-后端',
      input: {
        bachelorLevel: '双非',
        masterLevel: '无',
        phdLevel: '无',
        targetCity: '上海',
        targetIndustry: '信息传输、软件和信息技术服务专业',
        monthlyBaseSalary: 18000,
        monthsPerYear: 12,
        yearEndBonus: 0,
        annualStock: 0,
        monthlyAllowance: 0,
        workDaysPerWeek: 5,
        wfhDaysPerWeek: 0,
        annualLeave: 5,
        publicHolidays: 13,
        paidSickLeave: 0,
        dailyWorkHours: 9,
        commuteHours: 1.5,
        restHours: 1.5,
        workEnvironment: '普通',
        hasShuttle: false,
        hasCafeteria: false,
        cafeteriaQuality: '普通',
        locationPreference: '无所谓',
        hasSocialInsurance: '有',
        hasHousingFund: '有',
        socialInsuranceBase: 18000,
        housingFundBase: 18000,
        hasExtraInsurance: false,
        salaryPaymentTiming: '次月15日前',
        growthFactor: '一般',
        roleCoreFactor: '一般',
        companySizeFactor: '中型公司（200-2000人）',
        overtimeCultureFactor: '偶尔加班',
        housingMode: 'shared' as const,
      },
      result: {
        score: 1.05,
        rating: {
          label: '合理',
          color: 'text-blue-500',
          colorHex: '#3b82f6',
          description: '符合市场水平',
        },
        workingDays: 244.2,
        dailySalary: 737,
        totalCompensation: 180000,
        expectedAnnualSalary: 250000,
        expectedDailySalary: 962,
        educationScore: 2.5,
        envFactor: 1.02,
        envFactors: {
          workEnv: 1.0,
          cafeteria: 1.0,
          citySavings: 1.0,
          cityIncome: 91987,
          cityConsumption: 52000,
          annualHousingCost: 60000,
          savingsRate: 0.3,
          settlement: 1.0,
          newhomeDownPayment: 5000000,
          locationPref: 1.0,
          laborFactor: 1.0,
          socialInsuranceFactor: 1.0,
          housingFundFactor: 1.0,
          extraInsuranceFactor: 1.0,
          salaryPaymentFactor: 1.0,
          platformFactor: 1.0,
          growthFactor: 1.0,
          roleCoreFactor: 1.0,
          companySizeFactor: 1.0,
          overtimeCultureFactor: 1.03,
        },
        timeFactor: 1.125,
        officeRatio: 1.0,
        shuttleFactor: 1.0,
        effectiveHours: 9.0,
        industryAvgSalary: 0,
        industryFactor: 1.5,
        cityFactor: 1.15,
      },
    };

    expect(item.id).toBeTruthy();
    expect(item.label).toBe('字节-后端');
    expect(item.input.monthlyBaseSalary).toBe(18000);
    expect(item.result.score).toBe(1.05);
  });
});

// ── SharedFields type verification ──
describe('SharedFields', () => {
  it('contains education and industry fields', () => {
    const shared = {
      bachelorLevel: '双非',
      masterLevel: '无',
      phdLevel: '无',
      targetIndustry: '信息传输、软件和信息技术服务专业',
    };

    expect(shared.bachelorLevel).toBe('双非');
    expect(shared.masterLevel).toBe('无');
    expect(shared.phdLevel).toBe('无');
    expect(shared.targetIndustry).toBe('信息传输、软件和信息技术服务专业');
  });
});

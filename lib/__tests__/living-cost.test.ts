// ── 城市生活成本计算测试 ──

import {
  calcMonthlyPayment,
  calculateLivingCost,
  INTEREST_RATE,
  LOAN_YEARS,
  DOWN_PAYMENT_RATIO,
  DEFAULT_BUY_AREA,
  DEFAULT_WHOLE_RENT_AREA,
  DEFAULT_SHARED_RENT_AREA,
} from '../living-cost';
import type { CityIncomeData, CityHousingData } from '../types';

// ── 辅助：构造测试数据 ──

function createTestHousing(overrides: Partial<CityHousingData> = {}): CityHousingData {
  return {
    secondhandPrice: 1.5,
    newhomePrice: 1.8,
    wholeRentPrice: 35,
    sharedRentPrice: 50,
    ...overrides,
  };
}

function createTestIncome(overrides: Partial<CityIncomeData> = {}): CityIncomeData {
  return {
    income: 50000,
    consumption: 32000,
    ...overrides,
  };
}

// ── calcMonthlyPayment ──
describe('calcMonthlyPayment', () => {
  it('calculates equal principal and interest payment', () => {
    // 贷款 100 万，利率 3.2%，30 年
    const payment = calcMonthlyPayment(100, 0.032, 30);
    // 月供 ≈ 1000000 * [0.00267 * (1.00267)^360] / [(1.00267)^360 - 1]
    expect(payment).toBeGreaterThan(4000);
    expect(payment).toBeLessThan(4500);
  });

  it('returns 0 for zero loan', () => {
    expect(calcMonthlyPayment(0, 0.032, 30)).toBe(0);
  });
});

// ── calculateLivingCost ──
describe('calculateLivingCost', () => {
  it('returns null when no housing data', () => {
    expect(calculateLivingCost('成都', 150000, null, createTestIncome())).toBeNull();
  });

  it('returns null when no income data', () => {
    expect(calculateLivingCost('成都', 150000, createTestHousing(), null)).toBeNull();
  });

  it('returns null for zero salary', () => {
    expect(calculateLivingCost('成都', 0, createTestHousing(), createTestIncome())).toBeNull();
  });

  it('calculates buy results correctly', () => {
    const result = calculateLivingCost('成都', 150000, createTestHousing(), createTestIncome());
    expect(result).not.toBeNull();
    expect(result!.cityName).toBe('成都');
    // 二手房：1.5万/㎡ × 90㎡ = 135万
    expect(result!.secondhand.totalPrice).toBe(135);
    // 新房：1.8万/㎡ × 90㎡ = 162万
    expect(result!.newhome.totalPrice).toBe(162);
  });

  it('calculates rent results correctly', () => {
    const result = calculateLivingCost('成都', 150000, createTestHousing(), createTestIncome());
    expect(result).not.toBeNull();
    // 整租：35元/月/㎡ × 60㎡ = 2100元/月
    expect(result!.whole.monthlyRent).toBe(2100);
    // 合租：50元/月/㎡ × 20㎡ = 1000元/月
    expect(result!.shared.monthlyRent).toBe(1000);
  });

  it('calculates pressure index', () => {
    const result = calculateLivingCost('成都', 150000, createTestHousing(), createTestIncome());
    expect(result).not.toBeNull();
    expect(result!.livingPressureIndex).toBeGreaterThan(0);
    expect(result!.pressureRating).toBeDefined();
  });

  it('calculates income percentile', () => {
    const result = calculateLivingCost('成都', 150000, createTestHousing(), createTestIncome());
    expect(result).not.toBeNull();
    expect(result!.userIncomePercentile).toBeGreaterThanOrEqual(1);
    expect(result!.userIncomePercentile).toBeLessThanOrEqual(99);
  });

  it('high salary yields lower pressure than low salary', () => {
    const housing = createTestHousing();
    const income = createTestIncome();
    const low = calculateLivingCost('成都', 50000, housing, income);
    const high = calculateLivingCost('成都', 300000, housing, income);
    expect(high!.livingPressureIndex).toBeLessThan(low!.livingPressureIndex);
  });
});

// ── constants ──
describe('constants', () => {
  it('has correct interest rate', () => {
    expect(INTEREST_RATE).toBe(0.032);
  });

  it('has correct default areas', () => {
    expect(DEFAULT_BUY_AREA).toBe(90);
    expect(DEFAULT_WHOLE_RENT_AREA).toBe(60);
    expect(DEFAULT_SHARED_RENT_AREA).toBe(20);
  });

  it('has correct down payment ratio', () => {
    expect(DOWN_PAYMENT_RATIO).toBe(0.3);
  });

  it('has correct loan years', () => {
    expect(LOAN_YEARS).toBe(30);
  });
});

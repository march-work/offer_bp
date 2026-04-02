// ── 城市生活成本计算测试 ──

import {
  CITY_LIVING_DATA,
  calculateLivingCost,
} from '../living-cost';

describe('CITY_LIVING_DATA', () => {
  it('has 11 cities', () => {
    expect(Object.keys(CITY_LIVING_DATA)).toHaveLength(11);
  });

  it('each city has all required fields', () => {
    for (const [name, data] of Object.entries(CITY_LIVING_DATA)) {
      expect(data.income).toBeGreaterThan(0);
      expect(data.consumption).toBeGreaterThan(0);
      expect(data.consumption).toBeLessThan(data.income);
      expect(data.secondhandPrice).toBeGreaterThan(0);
      expect(data.newhomePrice).toBeGreaterThan(0);
      expect(data.wholeRentPrice).toBeGreaterThan(0);
      expect(data.sharedRentPrice).toBeGreaterThan(0);
    }
  });
});

describe('calculateLivingCost', () => {
  it('returns null for zero salary', () => {
    expect(calculateLivingCost('北京', 0)).toBeNull();
  });

  it('returns null for unknown city', () => {
    expect(calculateLivingCost('不存在', 300000)).toBeNull();
  });

  describe('北京 30万年薪', () => {
    const result = calculateLivingCost('北京', 300000)!;

    it('calculates whole rent monthly', () => {
      // 北京 wholeRentPrice=66.08, area=60
      expect(result.whole.monthlyRent).toBe(Math.round(66.08 * 60));
      expect(result.whole.monthlyRent).toBe(3965);
    });

    it('calculates shared rent monthly', () => {
      // 北京 sharedRentPrice=135.93, area=20
      expect(result.shared.monthlyRent).toBe(Math.round(135.93 * 20));
      expect(result.shared.monthlyRent).toBe(2719);
    });

    it('calculates whole rent income ratio', () => {
      const monthlyIncome = 300000 / 12;
      expect(result.whole.rentIncomeRatio).toBeCloseTo(3965 / monthlyIncome, 3);
    });

    it('calculates total housing price (secondhand)', () => {
      // 北京 secondhandPrice=4.78, area=90
      expect(result.secondhand.totalPrice).toBeCloseTo(4.78 * 90, 1);
    });

    it('calculates newhome total price', () => {
      // 北京 newhomePrice=6.50, area=90
      expect(result.newhome.totalPrice).toBeCloseTo(6.50 * 90, 1);
    });

    it('price-income ratio is reasonable for Beijing secondhand', () => {
      // 总价约 430 万 / 30 万年薪 ≈ 14.3
      expect(result.secondhand.priceIncomeRatio).toBeGreaterThan(10);
      expect(result.secondhand.priceIncomeRatio).toBeLessThan(20);
    });

    it('calculates down payment years', () => {
      // 首付约 129 万 / 30 万 ≈ 4.3 年
      expect(result.secondhand.downPaymentYears).toBeGreaterThan(3);
      expect(result.secondhand.downPaymentYears).toBeLessThan(8);
    });

    it('has monthly payment > 0', () => {
      expect(result.secondhand.monthlyPayment).toBeGreaterThan(0);
    });

    it('mortgage income ratio is significant for Beijing', () => {
      expect(result.secondhand.mortgageIncomeRatio).toBeGreaterThan(0.3);
    });

    it('living pressure index > 0', () => {
      expect(result.livingPressureIndex).toBeGreaterThan(0);
    });

    it('has rent rating', () => {
      expect(result.whole.rating).toBeTruthy();
    });

    it('has buy rating', () => {
      expect(result.secondhand.rating).toBeTruthy();
    });

    it('has pressure rating', () => {
      expect(result.pressureRating).toBeTruthy();
    });

    it('income percentile is between 1-99', () => {
      expect(result.userIncomePercentile).toBeGreaterThanOrEqual(1);
      expect(result.userIncomePercentile).toBeLessThanOrEqual(99);
    });
  });

  describe('成都 30万年薪', () => {
    const result = calculateLivingCost('成都', 300000)!;

    it('rent is cheaper than Beijing', () => {
      const bj = calculateLivingCost('北京', 300000)!;
      expect(result.whole.monthlyRent).toBeLessThan(bj.whole.monthlyRent);
    });

    it('housing price is lower', () => {
      const bj = calculateLivingCost('北京', 300000)!;
      expect(result.secondhand.totalPrice).toBeLessThan(bj.secondhand.totalPrice);
    });

    it('pressure index is lower than Beijing', () => {
      const bj = calculateLivingCost('北京', 300000)!;
      expect(result.livingPressureIndex).toBeLessThan(bj.livingPressureIndex);
    });
  });

  describe('深圳 高房价', () => {
    const result = calculateLivingCost('深圳', 300000)!;

    it('has highest secondhand price among all cities', () => {
      let maxPrice = 0;
      for (const data of Object.values(CITY_LIVING_DATA)) {
        if (data.secondhandPrice > maxPrice) maxPrice = data.secondhandPrice;
      }
      expect(CITY_LIVING_DATA['深圳'].secondhandPrice).toBe(maxPrice);
    });
  });

  describe('各城市一致性', () => {
    const cities = Object.keys(CITY_LIVING_DATA);

    it('all cities have valid results at 20万 salary', () => {
      for (const city of cities) {
        const result = calculateLivingCost(city, 200000);
        expect(result).not.toBeNull();
        expect(result!.livingPressureIndex).toBeGreaterThan(0);
        expect(result!.whole.rating).toBeTruthy();
      }
    });

    it('income percentile increases with salary', () => {
      const p1 = calculateLivingCost('上海', 50000)!.userIncomePercentile;
      const p2 = calculateLivingCost('上海', 300000)!.userIncomePercentile;
      const p3 = calculateLivingCost('上海', 1000000)!.userIncomePercentile;
      expect(p2).toBeGreaterThan(p1);
      expect(p3).toBeGreaterThan(p2);
    });
  });
});

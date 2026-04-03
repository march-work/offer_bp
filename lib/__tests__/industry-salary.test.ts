// ── 行业薪资模块测试 ──

import { getIndustryInfo } from '../industry-salary';

const TEST_SALARIES: Record<string, number> = {
  '信息传输、软件和信息技术服务专业': 120000,
  '金融专业': 100000,
  '制造专业': 70000,
  '教育专业': 65000,
};

// ── getIndustryInfo ──
describe('getIndustryInfo', () => {
  it('returns factor and salary for known city+industry', () => {
    const info = getIndustryInfo('北京', '信息传输、软件和信息技术服务专业', TEST_SALARIES);
    // 120000 / ((120000+100000+70000+65000)/4) = 120000 / 88750 ≈ 1.352
    expect(info.factor).toBeCloseTo(120000 / 88750, 2);
    expect(info.avgSalary).toBe(120000);
  });

  it('returns factor 1.0 for unknown industry', () => {
    const info = getIndustryInfo('北京', '不存在的行业', TEST_SALARIES);
    expect(info.factor).toBe(1.0);
    expect(info.avgSalary).toBe(0);
  });

  it('returns default when no data provided', () => {
    const info = getIndustryInfo('北京', '金融专业');
    expect(info.factor).toBe(1.0);
    expect(info.avgSalary).toBe(0);
  });

  it('calculates lower factor for lower-paying industry', () => {
    const it = getIndustryInfo('成都', '信息传输、软件和信息技术服务专业', TEST_SALARIES);
    const edu = getIndustryInfo('成都', '教育专业', TEST_SALARIES);
    expect(it.factor).toBeGreaterThan(edu.factor);
  });

  it('calculates correct city average', () => {
    const avg = (120000 + 100000 + 70000 + 65000) / 4;
    const info = getIndustryInfo('成都', '制造专业', TEST_SALARIES);
    expect(info.avgSalary).toBe(70000);
    expect(info.factor).toBeCloseTo(70000 / avg, 4);
  });
});

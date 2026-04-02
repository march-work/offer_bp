// ── 行业薪资模块测试 ──

import { getIndustryInfo, getIndustrySalaryCities } from '../industry-salary';

describe('getIndustrySalaryCities', () => {
  it('returns 11 cities', () => {
    expect(getIndustrySalaryCities()).toHaveLength(11);
  });

  it('includes key cities', () => {
    const cities = getIndustrySalaryCities();
    expect(cities).toContain('北京');
    expect(cities).toContain('上海');
    expect(cities).toContain('成都');
  });
});

describe('getIndustryInfo', () => {
  it('returns factor and salary for known city+industry', () => {
    const info = getIndustryInfo('北京', '信息传输、软件和信息技术服务专业');
    expect(info.avgSalary).toBe(340678);
    expect(info.factor).toBeGreaterThan(1.0);
  });

  it('金融 pays more than average in all cities', () => {
    for (const city of getIndustrySalaryCities()) {
      const info = getIndustryInfo(city, '金融专业');
      expect(info.factor).toBeGreaterThan(1.0);
      expect(info.avgSalary).toBeGreaterThan(0);
    }
  });

  it('制造 has valid data in all cities', () => {
    for (const city of getIndustrySalaryCities()) {
      const info = getIndustryInfo(city, '制造专业');
      expect(info.avgSalary).toBeGreaterThan(0);
    }
  });

  it('returns fallback for unknown city', () => {
    const info = getIndustryInfo('未知城市', '信息传输、软件和信息技术服务专业');
    expect(info.factor).toBe(1.0);
    expect(info.avgSalary).toBe(0);
  });

  it('returns fallback for unknown industry', () => {
    const info = getIndustryInfo('北京', '其他');
    expect(info.factor).toBe(1.0);
    expect(info.avgSalary).toBe(0);
  });

  it('returns correct salary for specific city+industry', () => {
    const info = getIndustryInfo('上海', '科学研究和技术服务专业');
    expect(info.avgSalary).toBe(263286);
    expect(info.factor).toBeGreaterThan(1.0);
  });

  it('北京 IT avg salary is higher than 成都', () => {
    const bj = getIndustryInfo('北京', '信息传输、软件和信息技术服务专业');
    const cd = getIndustryInfo('成都', '信息传输、软件和信息技术服务专业');
    expect(bj.avgSalary).toBeGreaterThan(cd.avgSalary);
  });

  it('all industries in each city have factor > 0', () => {
    const industries = [
      '金融专业', '信息传输、软件和信息技术服务专业', '制造专业',
      '教育专业', '卫生和社会工作专业',
    ];
    for (const city of getIndustrySalaryCities()) {
      for (const ind of industries) {
        const info = getIndustryInfo(city, ind);
        expect(info.factor).toBeGreaterThan(0);
        expect(info.avgSalary).toBeGreaterThan(0);
      }
    }
  });
});

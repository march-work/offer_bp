// ── 城市分行业平均工资数据 ──
// 数据来源：各市统计局《统计公报》/《统计年鉴》2024 年城镇单位分行业年平均工资
// 数据来自 public/cities/{city}/industry_salary.json

export interface IndustryInfo {
  /** 真实行业因子 = 行业平均工资 / 城市全行业平均 */
  factor: number;
  /** 该城市该行业的年平均工资（元），0 表示无数据 */
  avgSalary: number;
}

/** 获取城市某行业的真实因子和平均工资 */
export function getIndustryInfo(
  city: string,
  industry: string,
  industrySalaries?: Record<string, number>,
): IndustryInfo {
  // 必须提供 JSON 数据
  const cityData = industrySalaries;
  if (!cityData) return { factor: 1.0, avgSalary: 0 };

  const industrySalary = cityData[industry];
  if (!industrySalary) return { factor: 1.0, avgSalary: 0 };

  const salaries = Object.values(cityData) as number[];
  const cityAvg = salaries.reduce((a, b) => a + b, 0) / salaries.length;

  return {
    factor: industrySalary / cityAvg,
    avgSalary: industrySalary,
  };
}

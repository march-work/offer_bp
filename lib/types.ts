// ── 应届生评测器类型定义 ──

export type Education = '专科及以下' | '本科' | '硕士' | '博士';
export type SchoolLevel = string; // 根据 Education 联动

export type CityTier = '超一线' | '一线' | '新一线' | '二线' | '三线及以下';
export type Industry =
  | 'AI/大模型'
  | '半导体/芯片'
  | '互联网/软件'
  | '新能源/汽车'
  | '金融/银行'
  | '医疗/医药'
  | '消费品/快消'
  | '制造业'
  | '教育/培训'
  | '其他';

export interface FreshGradInput {
  // 个人信息
  education: Education;
  schoolLevel: SchoolLevel;
  targetCity: CityTier;
  targetIndustry: Industry;

  // 薪资（TC 总包结构）
  monthlyBaseSalary: number;   // 月薪基数（元/月）
  bonusMonths: number;         // 年终奖月数（如 3 = 15薪）
  annualStock: number;         // 股票/期权年化价值（万元/年）
  monthlyAllowance: number;    // 月补贴总额（元/月）

  // 工时
  workDaysPerWeek: number;
  wfhDaysPerWeek: number;
  annualLeave: number;
  publicHolidays: number;
  paidSickLeave: number;
  dailyWorkHours: number;
  commuteHours: number;
  restHours: number;

  // 环境
  workEnvironment: string;
  leaderRelation: string;
  colleagueRelation: string;
  cityLevel: CityTier;
  hasShuttle: boolean;
  hasCafeteria: boolean;
  cafeteriaQuality: string;
}

export interface FreshGradResult {
  score: number;
  rating: RatingInfo;
  workingDays: number;
  dailySalary: number;
  totalCompensation: number;      // 年总包（元）
  expectedAnnualSalary: number;
  expectedDailySalary: number;
  envFactor: number;
  effectiveHours: number;
  officeRatio: number;
  shuttleFactor: number;
}

export interface RatingInfo {
  label: string;
  color: string;
  colorHex: string;
  description: string;
}

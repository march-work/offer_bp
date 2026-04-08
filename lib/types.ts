// ── 应届生评测器类型定义 ──

export type Industry =
  | '金融专业'
  | '信息传输、软件和信息技术服务专业'
  | '卫生和社会工作专业'
  | '科学研究和技术服务专业'
  | '教育专业'
  | '文化、体育和娱乐专业'
  | '制造专业'
  | '建筑专业'
  | '交通运输、仓储和邮政专业'
  | '批发和零售专业'
  | '租赁和商务服务专业'
  | '电力、热力、燃气及水生产和供应专业'
  | '水利、环境和公共设施管理专业'
  | '公共管理、社会保障和社会组织专业'
  | '房地产专业'
  | '住宿和餐饮专业'
  | '居民服务、修理和其他服务专业'
  | '采矿专业'
  | '农、林、牧、渔专业'
  | '其他';

export interface FreshGradInput {
  // 学历（三列独立选择）
  bachelorLevel: string;     // 本科等级，必选
  masterLevel: string;       // 硕士等级，'无' 表示未读
  phdLevel: string;          // 博士等级，'无' 表示未读

  // 地点
  targetCity: string;
  targetIndustry: Industry;

  // 薪资
  monthlyBaseSalary: number;
  monthsPerYear: number;
  yearEndBonus: number;
  annualStock: number;
  monthlyAllowance: number;

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
  hasShuttle: boolean;
  hasCafeteria: boolean;
  cafeteriaQuality: string;
  locationPreference: string;
  hasSocialInsurance: string;  // '有' | '无' | ''
  hasHousingFund: string;     // '有' | '无' | ''
  socialInsuranceBase: number; // 五险基数
  housingFundBase: number;    // 公积金基数
  hasExtraInsurance: boolean;  // 六险或二金
  salaryPaymentTiming: string; // 工资发放时间

  // 平台系数
  growthFactor: string;      // 个人发展空间
  roleCoreFactor: string;    // 岗位核心程度
  companySizeFactor: string; // 公司规模
  overtimeCultureFactor: string; // 加班文化

  // 居住方式（影响城市存钱系数）
  housingMode: 'newhome' | 'secondhand' | 'whole' | 'shared';

  // 区县（可选，不选则用全市均价）
  targetDistrict?: string;
}

export interface FreshGradResult {
  score: number;
  rating: RatingInfo;
  workingDays: number;
  dailySalary: number;
  totalCompensation: number;
  expectedAnnualSalary: number;
  expectedDailySalary: number;
  educationScore: number;
  envFactor: number;
  envFactors: {
    workEnv: number;
    cafeteria: number;
    citySavings: number;
    cityIncome: number;
    cityConsumption: number;
    annualHousingCost: number;
    savingsRate: number;
    settlement: number;
    newhomeDownPayment: number;
    locationPref: number;
    laborFactor: number;
    socialInsuranceFactor: number;
    housingFundFactor: number;
    extraInsuranceFactor: number;
    salaryPaymentFactor: number;
    platformFactor: number;
    growthFactor: number;
    roleCoreFactor: number;
    companySizeFactor: number;
    overtimeCultureFactor: number;
  };
  timeFactor: number;
  officeRatio: number;
  shuttleFactor: number;
  effectiveHours: number;
  industryAvgSalary: number;
  industryFactor: number;
  cityFactor: number;
}

/** 城市计算数据（从 JSON 加载） */
export interface CityCalculationData {
  income: number;
  consumption: number;
  secondhandPrice: number;
  newhomePrice: number;
  wholeRentPrice: number;
  sharedRentPrice: number;
  industrySalaries: Record<string, number>;
}

// ── 类型组合（用于消除重复）──

/** 仅包含收入和消费的城市数据子集 */
export type CityIncomeData = Pick<CityCalculationData, 'income' | 'consumption'>;

/** 仅包含房价数据的子集 */
export type CityHousingData = Pick<CityCalculationData, 'secondhandPrice' | 'newhomePrice' | 'wholeRentPrice' | 'sharedRentPrice'>;

export interface RatingInfo {
  label: string;
  color: string;
  colorHex: string;
  description: string;
}

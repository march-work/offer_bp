// ── 应届生评测器常量表 ──

import type { RatingInfo, FreshGradInput } from './types';

// ── 标准年工作日基准 ──
export const STANDARD_WORKING_DAYS = 260;
export const STANDARD_HOURS = 8;

// ── 三列学历选项及分值 ──
// 分值 1-10，越高代表市场认可度越高
export const BACHELOR_OPTIONS: { label: string; score: number }[] = [
  { label: '专科', score: 0.5 },
  { label: '专升本', score: 1.0 },
  { label: '双非', score: 2.5 },
  { label: '双非+双一流专业', score: 4.0 },
  { label: '211', score: 5.0 },
  { label: '强势211', score: 6.0 },
  { label: '985', score: 7.0 },
  { label: '华五/C9', score: 8.0 },
  { label: '清北', score: 9.5 },
  { label: '海外QS/USNews/THE/软科 100', score: 5.5 },
  { label: '海外QS/USNews/THE/软科 30', score: 7.5 },
];

export const MASTER_OPTIONS: { label: string; score: number }[] = [
  { label: '双非硕士', score: 2.0 },
  { label: '211硕士', score: 4.0 },
  { label: '985硕士', score: 6 },
  { label: '华五/C9硕士', score: 7 },
  { label: '清北硕士', score: 8.5 },  
  { label: '海外QS/USNews/THE/软科 100', score: 3.0 },
  { label: '海外QS/USNews/THE/软科 30', score: 4.5 },
  { label: '直博', score: 0 },
];

export const PHD_OPTIONS: { label: string; score: number }[] = [
  { label: '双非博士', score: 4.0 },
  { label: '211博士', score: 5.0 },
  { label: '985博士', score: 7.0 },
  { label: '华五/C9博士', score: 8.5 },
  { label: '清北博士', score: 9.5 },
  { label: '海外QS/USNews/THE/软科 100', score: 6.0 },
  { label: '海外QS/USNews/THE/软科 30', score: 8.0 },
  { label: '我是TOP/大牛', score: 12.0 },
];

// ── 学历分值 → 期望年薪（万元）映射 ──
// 算法：金本银硕铜博，按加权分值线性插值
export const SALARY_SCORE_MAP: [number, number][] = [
  [0.5, 4],
  [1.0, 4.5],
  [1.5, 6],
  [2.0, 7],
  [3.0, 8.5],
  [4.0, 11],
  [5.0, 14],
  [6.0, 19],
  [7.0, 25],
  [8.0, 34],
  [9.0, 47],
  [10.0, 65],
];

// ── 城市相关 ──
export const CITY_OPTIONS = [
  '北京', '上海', '深圳', '广州', '杭州',
  '南京', '成都', '武汉', '西安', '合肥', '青岛', '其他',
] as const;

// ── 11 城人均可支配收入（元/年）──
// 数据来源：各城市统计局 2024 年
export const CITY_INCOME_MAP: Record<string, number> = {
  '上海': 91987,
  '北京': 89090,
  '深圳': 81123,
  '广州': 83436,
  '杭州': 80017,
  '南京': 75180,
  '合肥': 55832,
  '成都': 52024,
  '武汉': 59732,
  '西安': 45082,
  '青岛': 59922,
};

/** 11 城人均可支配收入均值 */
const allCityIncomes = Object.values(CITY_INCOME_MAP);
export const CITY_INCOME_AVG = allCityIncomes.reduce((a, b) => a + b, 0) / allCityIncomes.length;

/** 城市因子 = 城市人均收入 / 11城均值，<1 部分线性缩放到 [0.8, 1.0] */
export function getCityFactor(city: string): number {
  const income = CITY_INCOME_MAP[city];
  if (!income) return 1.0;
  const raw = income / CITY_INCOME_AVG;
  if (raw >= 1.0) return raw;
  if (raw <= 0.6) return 0.8;
  // [0.6, 1.0] → [0.8, 1.0]
  return 0.8 + (raw - 0.6) * 0.5;
}

// ── 11 城储蓄率（归一化基数用，合租模式）──
// 储蓄率 = (人均收入 - 人均支出 × 0.7 - 合租单价 × 20㎡ × 12) / 人均收入
export const CITY_SAVINGS_RATE_MAP: Record<string, number> = {
  '北京': 0.227,
  '上海': 0.360,
  '深圳': 0.200,
  '广州': 0.364,
  '杭州': 0.351,
  '南京': 0.394,
  '合肥': 0.444,
  '成都': 0.307,
  '武汉': 0.333,
  '西安': 0.372,
  '青岛': 0.409,
};

/** 11 城储蓄率均值 */
const allCitySavingsRates = Object.values(CITY_SAVINGS_RATE_MAP);
export const CITY_SAVINGS_RATE_AVG = allCitySavingsRates.reduce((a, b) => a + b, 0) / allCitySavingsRates.length;

// ── 行业系数（仅用于无真实数据时的兜底）──
export const INDUSTRY_FACTOR: Record<string, number> = {
  '金融专业': 1.50,
  '信息传输、软件和信息技术服务专业': 1.50,
  '卫生和社会工作专业': 1,
  '科学研究和技术服务专业': 1.15,
  '教育专业': 0.80,
  '文化、体育和娱乐专业': 0.95,
  '制造专业': 0.90,
  '其他': 0.85,
};

// ── 工作环境系数 ──
export const WORK_ENV_FACTOR: Record<string, number> = {
  '高端园区': 1.2,
  'CBD/甲级写字楼': 1.1,
  '普通': 1.0,
  '偏远/厂区': 0.9,
  '条件较差': 0.8,
};

export const CAFETERIA_FACTOR: Record<string, number> = {
  '丰富且便宜': 1.15,
  '不错': 1.1,
  '普通': 1.0,
  '较差': 0.9,
  '无食堂': 1.0,
};

export const LOCATION_PREF_FACTOR: Record<string, number> = {
  '喜欢/离家近': 1.1,
  '无所谓': 1.0,
  '不太满意/有点远': 0.9,
};

// ── 平台系数因子 ──
export const GROWTH_FACTOR: Record<string, number> = {
  '晋升路径清晰': 1.2,
  '有一定空间': 1.1,
  '一般': 1.0,
  '空间有限': 0.9,
  '几乎没有': 0.8,
};

export const ROLE_CORE_FACTOR: Record<string, number> = {
  '核心业务线': 1.2,
  '重要支撑': 1.1,
  '一般': 1.0,
  '边缘岗位': 0.9,
  '随时可替代': 0.8,
};

export const COMPANY_SIZE_FACTOR: Record<string, number> = {
  '大厂/行业头部': 1.2,
  '中大型企业（>2000人）': 1.1,
  '中型公司（200-2000人）': 1.0,
  '小公司（50-200人）': 0.9,
  '初创/微型': 0.8,
};

export const OVERTIME_CULTURE_FACTOR: Record<string, number> = {
  '准点下班': 1.0,
  '偶尔加班': 1.03,
  '常态化加班': 1.1,
  '严重内卷': 1.2,
};

export const GROWTH_OPTIONS = ['晋升路径清晰', '有一定空间', '一般', '空间有限', '几乎没有'] as const;
export const ROLE_CORE_OPTIONS = ['核心业务线', '重要支撑', '一般', '边缘岗位', '随时可替代'] as const;
export const COMPANY_SIZE_OPTIONS = ['大厂/行业头部', '中大型企业（>2000人）', '中型公司（200-2000人）', '小公司（50-200人）', '初创/微型'] as const;
export const OVERTIME_CULTURE_OPTIONS = ['准点下班', '偶尔加班', '常态化加班', '严重内卷'] as const;

// ── 工资发放时间系数 ──
export const SALARY_PAYMENT_FACTOR: Record<string, number> = {
  '当月发放': 1.1,
  '次月15日前': 1.0,
  '压一个月': 0.93,
  '压两个月': 0.8,
};
export const SALARY_PAYMENT_OPTIONS = ['当月发放', '次月15日前', '压一个月', '压两个月'] as const;

// ── 评级体系 ──
export const RATINGS: { max: number; info: RatingInfo }[] = [
  { max: 0.5, info: { label: '大冤种', color: 'text-pink-800', colorHex: '#9d174d', description: '严重低于市场，快跑！' } },
  { max: 0.7, info: { label: '偏低', color: 'text-red-500', colorHex: '#ef4444', description: '明显低于期望' } },
  { max: 0.9, info: { label: '一般', color: 'text-orange-500', colorHex: '#f97316', description: '略低于期望，可以谈谈' } },
  { max: 1.1, info: { label: '合理', color: 'text-blue-500', colorHex: '#3b82f6', description: '符合市场水平' } },
  { max: 1.3, info: { label: '不错', color: 'text-green-500', colorHex: '#22c55e', description: '超出期望' } },
  { max: 1.6, info: { label: '很香', color: 'text-purple-500', colorHex: '#a855f7', description: '远超期望' } },
  { max: Infinity, info: { label: '天选 Offer', color: 'text-yellow-500', colorHex: '#eab308', description: '顶级 offer！' } },
];

// ── 通用评级工具 ──

interface SimpleRating {
  label: string;
  color: string;
}

/**
 * 通用评级函数：根据值和阈值配置返回评级
 * @param value 要评级的值
 * @param config 评级配置（阈值从小到大排列，labels 和 colors 对应）
 * @returns 评级结果
 */
export function getSimpleRating(
  value: number,
  config: { thresholds: number[]; labels: string[]; colors: string[] }
): SimpleRating {
  const { thresholds, labels, colors } = config;
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) {
      return { label: labels[i], color: colors[i] };
    }
  }
  return { label: labels[labels.length - 1], color: colors[colors.length - 1] };
}

// ── 预设评级配置 ──

/** 租房收入比评级配置 */
export const RENT_RATING_CONFIG = {
  thresholds: [0.25, 0.35, 0.5],
  labels: ['轻松', '合理', '偏高', '沉重'],
  colors: ['text-green-500', 'text-blue-500', 'text-orange-400', 'text-red-500'],
};

/** 买房总价收入比评级配置 */
export const BUY_RATING_CONFIG = {
  thresholds: [6, 10, 15],
  labels: ['轻松', '合理', '偏高', '沉重'],
  colors: ['text-green-500', 'text-blue-500', 'text-orange-400', 'text-red-500'],
};

/** 居住压力指数评级配置 */
export const PRESSURE_RATING_CONFIG = {
  thresholds: [0.5, 0.8, 1.2],
  labels: ['轻松', '合理', '偏高', '沉重'],
  colors: ['text-green-500', 'text-blue-500', 'text-orange-400', 'text-red-500'],
};

// ── 表单选项 ──
export const INDUSTRY_OPTIONS = [
  '金融专业',
  '信息传输、软件和信息技术服务专业',
  '卫生和社会工作专业',
  '科学研究和技术服务专业',
  '教育专业',
  '文化、体育和娱乐专业',
  '制造专业',
  '建筑专业',
  '交通运输、仓储和邮政专业',
  '批发和零售专业',
  '租赁和商务服务专业',
  '电力、热力、燃气及水生产和供应专业',
  '水利、环境和公共设施管理专业',
  '公共管理、社会保障和社会组织专业',
  '房地产专业',
  '住宿和餐饮专业',
  '居民服务、修理和其他服务专业',
  '采矿专业',
  '农、林、牧、渔专业',
  '其他',
] as const;

export const WORK_ENV_OPTIONS = ['高端园区', 'CBD/甲级写字楼', '普通', '偏远/厂区', '条件较差'] as const;

export const CAFETERIA_OPTIONS = ['丰富且便宜', '不错', '普通', '较差'] as const;
export const LOCATION_PREF_OPTIONS = ['喜欢/离家近', '无所谓', '不太满意/有点远'] as const;

export const MONTHS_PER_YEAR_OPTIONS = [12, 13, 14, 15, 16, 18, 20, 24] as const;
export const ALLOWANCE_OPTIONS = [0, 500, 800, 1000, 1500, 2000, 2500, 3000, 4000, 5000] as const;

export const WORK_DAYS_OPTIONS = [4, 5, 6, 7] as const;
export const WFH_DAYS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const DAILY_HOURS_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export const REST_HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5] as const;

// ══════════════════════════════════════════════════════════════
// ── 以下原散落在 calculate.ts / living-cost.ts 的公式参数 ──
// ══════════════════════════════════════════════════════════════

// ── 班车系数 ──
export const SHUTTLE_FACTOR_HAS = 0.3;
export const SHUTTLE_FACTOR_NO = 1.0;

// ── 学历权重（混合学历时本/硕/博各自的占比）──
export const EDUCATION_WEIGHTS: Record<string, { b: number; m: number; p: number }> = {
  bachelor: { b: 0.5, m: 0.0, p: 0.0 },
  master: { b: 0.35, m: 0.65, p: 0.0 },
  phd: { b: 0.25, m: 0.15, p: 0.6 },
  direct_phd: { b: 0.35, m: 0.0, p: 0.65 },
};

// ── 工时公式系数 ──
export const SICK_LEAVE_DISCOUNT = 0.6;      // 带薪病假折算系数
export const REST_TIME_DISCOUNT = 0.5;       // 休息时间折扣系数

// ── 定居期望因子映射 ──
// 10年收入 / 首付 的比值映射到 [SETTLEMENT_MIN, SETTLEMENT_MAX]
export const SETTLEMENT_RATIO_MIN = 1;       // 比值 ≤ 此值 → 取最小
export const SETTLEMENT_RATIO_MAX = 3;       // 比值 ≥ 此值 → 取最大
export const SETTLEMENT_FACTOR_MIN = 0.8;
export const SETTLEMENT_FACTOR_MAX = 1.2;

// ── 城市储蓄系数分段映射 ──
// rawSavings → 系数：≤0 → CITY_SAVINGS_MIN, ≥CITY_SAVINGS_RAW_MAX → CITY_SAVINGS_MAX
export const CITY_SAVINGS_RAW_MAX = 1.5;
export const CITY_SAVINGS_MIN = 0.6;
export const CITY_SAVINGS_LOW = 0.8;
export const CITY_SAVINGS_MAX = 1.2;

// ── 社保/公积金基数系数分段 ──
export const BASE_RATIO_LOW = 0.5;           // 基数/月薪 < 此值 → 最小
export const BASE_RATIO_MID = 0.8;           // ≤ 此值 → 1.0
export const BASE_RATIO_HIGH = 1.05;         // ≤ 此值 → 1.0
export const BASE_FACTOR_MIN = 0.8;
export const BASE_FACTOR_MAX = 1.2;

// ── 无社保 / 无公积金 默认系数 ──
export const NO_SOCIAL_INSURANCE_FACTOR = 0.8;
export const NO_HOUSING_FUND_FACTOR = 0.9;

// ── 六险或二金系数 ──
export const EXTRA_INSURANCE_FACTOR = 1.1;

// ── 储蓄率计算：消费支出折扣 ──
export const CONSUMPTION_DISCOUNT = 0.7;

// ── 表单默认值 ──

/** 完整的 FreshGradInput 默认值（单一数据源） */
export const DEFAULT_FRESH_GRAD_INPUT: FreshGradInput = {
  bachelorLevel: '双非',
  masterLevel: '无',
  phdLevel: '无',
  targetCity: '上海',
  targetIndustry: '信息传输、软件和信息技术服务专业',
  monthlyBaseSalary: 0,
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
  socialInsuranceBase: 0,
  housingFundBase: 0,
  hasExtraInsurance: false,
  salaryPaymentTiming: '次月15日前',
  growthFactor: '一般',
  roleCoreFactor: '一般',
  companySizeFactor: '中型公司（200-2000人）',
  overtimeCultureFactor: '偶尔加班',
  housingMode: 'shared',
};

/** 极速版覆盖字段（与 DEFAULT_FRESH_GRAD_INPUT 合并使用） */
export const QUICK_MODE_OVERRIDES: Partial<FreshGradInput> = {
  locationPreference: '无所谓',
  annualStock: 0,
  monthlyAllowance: 0,
  hasExtraInsurance: false,
  salaryPaymentTiming: '次月15日前',
  wfhDaysPerWeek: 0,
  publicHolidays: 13,
  paidSickLeave: 0,
  commuteHours: 0,
  growthFactor: '一般',
  roleCoreFactor: '一般',
};

// ── 居住成本参数 ──
export const DEFAULT_BUY_AREA = 90;           // 买房面积 ㎡
export const DEFAULT_WHOLE_RENT_AREA = 60;    // 整租面积 ㎡
export const DEFAULT_SHARED_RENT_AREA = 20;   // 合租面积 ㎡
export const DOWN_PAYMENT_RATIO = 0.30;       // 首付比例
export const LOAN_YEARS = 30;                 // 贷款年限
export const INTEREST_RATE = 0.032;           // 贷款利率（LPR）

// ── 居住压力指数权重 ──
export const PRESSURE_WEIGHT_BUY = 0.5;       // 买房总价收入比权重
export const PRESSURE_WEIGHT_RENT = 0.3;      // 租金收入比权重
export const PRESSURE_WEIGHT_SAVINGS = 0.2;   // 储蓄率权重
export const PRESSURE_BUY_BASELINE = 10;      // 买房总价收入比基准
export const PRESSURE_RENT_BASELINE = 0.3;    // 租金收入比基准

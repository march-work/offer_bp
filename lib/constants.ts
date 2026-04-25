// ── 应届生评测器常量表 ──

import type { RatingInfo, FreshGradInput, Industry } from './types';

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

// ── 城市收入参考值（用于归一化）──
// 11 城城镇居民人均可支配收入均值，来源：《2025前程无忧人力资源白皮书》
// 更新方式：年度数据刷新后重新计算此值
/** 11 城城镇居民人均可支配收入均值（聚合基准） */
export const CITY_INCOME_AVG = 76549;

/** 城市因子 = 城市人均收入 / City Avg，<1 的部分线性缩放到 [0.8, 1.0] */
export function getCityFactor(cityIncome: number): number {
  if (!cityIncome) return 1.0;
  const raw = cityIncome / CITY_INCOME_AVG;
  if (raw >= 1.0) return raw;
  if (raw <= 0.6) return 0.8;
  return 0.8 + (raw - 0.6) * 0.5;
}

// ── 11 城储蓄率（归一化基数用，合租模式）──
// 储蓄率 = (人均收入 - 人均支出 × 0.7 - 合租单价 × 20㎡ × 12) / 人均收入
// CITY_SAVINGS_RATE_MAP 已废弃，使用聚合基准 CITY_SAVINGS_RATE_AVG
export const CITY_SAVINGS_RATE_AVG = 0.342;

// ── 行业系数（仅用于无真实数据时的兜底）──
export const INDUSTRY_FACTOR: Record<string, number> = {
  '金融专业': 1.50,
  '信息传输、软件和信息技术服务专业': 1.50,
  '卫生和社会工作专业': 1.00,
  '科学研究和技术服务专业': 1.15,
  '教育专业': 0.80,
  '文化、体育和娱乐专业': 0.95,
  '制造专业': 0.90,
  '建筑专业': 0.85,
  '交通运输、仓储和邮政专业': 0.85,
  '批发和零售专业': 0.80,
  '租赁和商务服务专业': 0.90,
  '电力、热力、燃气及水生产和供应专业': 0.95,
  '水利、环境和公共设施管理专业': 0.80,
  '公共管理、社会保障和社会组织专业': 0.85,
  '房地产专业': 0.80,
  '住宿和餐饮专业': 0.70,
  '居民服务、修理和其他服务专业': 0.70,
  '采矿专业': 0.90,
  '农、林、牧、渔专业': 0.65,
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

// 白皮书热招行业 → 内部统计局行业映射
export const HOT_JOB_INDUSTRIES: {
  displayName: string;
  mappedIndustry: Industry;
}[] = [
  { displayName: '互联网', mappedIndustry: '信息传输、软件和信息技术服务专业' },
  { displayName: '计算机', mappedIndustry: '信息传输、软件和信息技术服务专业' },
  { displayName: '电子/半导体/集成电路', mappedIndustry: '制造专业' },
  { displayName: '机械设备制造', mappedIndustry: '制造专业' },
  { displayName: '汽车', mappedIndustry: '制造专业' },
  { displayName: '金融', mappedIndustry: '金融专业' },
  { displayName: '生物/医药', mappedIndustry: '卫生和社会工作专业' },
  { displayName: '贸易/进出口', mappedIndustry: '批发和零售专业' },
  { displayName: '能源/化工', mappedIndustry: '电力、热力、燃气及水生产和供应专业' },
  { displayName: '快速消费品', mappedIndustry: '居民服务、修理和其他服务专业' },
];

/** 白皮书行业名 → 内部行业名 的快速查找表 */
export const HOT_JOB_MAP: Record<string, Industry> = {};
for (const h of HOT_JOB_INDUSTRIES) {
  HOT_JOB_MAP[h.displayName] = h.mappedIndustry;
}

/** 判断是否为白皮书行业 */
export function isHotJobIndustry(name: string): boolean {
  return name in HOT_JOB_MAP;
}

/** 将任意行业名（白皮书或统计局）解析为统计局内部名，用于 salary 查表 */
export function resolveInternalIndustry(name: string): string {
  return HOT_JOB_MAP[name] ?? name;
}

// 有白皮书数据的行业名集合（用于从原19项中排除已被白皮书替代的）
const _hotJobInternalSet = new Set<string>(HOT_JOB_INDUSTRIES.map(h => h.mappedIndustry));

// 保留的原有行业（未被白皮书覆盖）
const _legacyIndustries = [
  '科学研究和技术服务专业',
  '教育专业',
  '文化、体育和娱乐专业',
  '建筑专业',
  '交通运输、仓储和邮政专业',
  '租赁和商务服务专业',
  '水利、环境和公共设施管理专业',
  '公共管理、社会保障和社会组织专业',
  '房地产专业',
  '住宿和餐饮专业',
  '采矿专业',
  '农、林、牧、渔专业',
  '其他',
] as const;

/** 合并后的完整行业列表：白皮书10个 + 保留原有行业 */
export const INDUSTRY_OPTIONS = [
  ...HOT_JOB_INDUSTRIES.map(h => h.displayName),
  ..._legacyIndustries,
] as const;

/** 一线城市列表（用于白皮书薪资切换） */
export const TIER1_CITIES = ['北京', '上海', '广州', '深圳'] as const;

/** 原统计局行业完整列表（内部计算用） */
export const STATISTICAL_INDUSTRY_OPTIONS = [
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

export const WFH_DAYS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

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
  targetIndustry: '互联网',
  targetPosition: '',
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
  hasSocialInsurance: '',
  hasHousingFund: '',
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
  commuteHours: 0,
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

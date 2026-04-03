// ── 应届生评测器常量表 ──

import type { CityTier, RatingInfo } from './types';

// ── 标准年工作日基准 ──
export const STANDARD_WORKING_DAYS = 260;
export const STANDARD_HOURS = 8;

// ── 三列学历选项及分值 ──
// 分值 1-10，越高代表市场认可度越高
export const BACHELOR_OPTIONS: { label: string; score: number }[] = [
  { label: '专科', score: 1.0 },
  { label: '专升本', score: 1.5 },
  { label: '双非', score: 3.0 },
  { label: '双一流', score: 4.0 },
  { label: '211', score: 5.0 },
  { label: '强势211', score: 6.0 },
  { label: '985', score: 7.0 },
  { label: '华五/C9', score: 8.0 },
  { label: '清北', score: 9.5 },
  { label: '海外QS100', score: 5.5 },
  { label: '海外QS30', score: 7.5 },
];

export const MASTER_OPTIONS: { label: string; score: number }[] = [
  { label: '双非硕士', score: 2.0 },
  { label: '211硕士', score: 4.0 },
  { label: '985硕士', score: 6.0 },
  { label: '华五/C9硕士', score: 7.5 },
  { label: '清北硕士', score: 8.5 },
  { label: '海外QS100', score: 5.0 },
  { label: '海外QS30', score: 7.0 },
  { label: '直博', score: 0 },
];

export const PHD_OPTIONS: { label: string; score: number }[] = [
  { label: '双非博士', score: 3.0 },
  { label: '211博士', score: 5.0 },
  { label: '985博士', score: 7.0 },
  { label: '华五/C9博士', score: 8.5 },
  { label: '清北博士', score: 9.5 },
  { label: '海外QS100', score: 6.0 },
  { label: '海外QS30', score: 8.0 },
  { label: '顶尖Top20', score: 10.0 },
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

export const CITY_TO_TIER: Record<string, CityTier> = {
  '北京': '超一线', '上海': '超一线', '深圳': '超一线',
  '广州': '一线', '杭州': '一线',
  '南京': '新一线', '成都': '新一线', '武汉': '新一线', '西安': '新一线',
  '合肥': '二线', '青岛': '二线',
  '其他': '三线及以下',
};

export const CITY_SALARY_FACTOR: Record<string, number> = {
  '超一线': 1.30,
  '一线': 1.15,
  '新一线': 1.00,
  '二线': 0.85,
  '三线及以下': 0.70,
};

// ── 全国平均存钱系数 ──
// 数据来源：国家统计局 2024 年
// 系数 = 全体居民人均可支配收入 / 全体居民人均消费支出
export const NATIONAL_SAVINGS_RATIO = 1.46;

// ── 行业系数（仅用于无真实数据时的兜底）──
export const INDUSTRY_FACTOR: Record<string, number> = {
  '金融专业': 1.10,
  '信息传输、软件和信息技术服务专业': 1.20,
  '卫生和社会工作专业': 1.05,
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

export const LEADER_FACTOR: Record<string, number> = {
  '善解人意': 1.2,
  '比较好': 1.1,
  '中规中矩': 1.0,
  '比较坑': 0.9,
  '简直噩梦': 0.8,
};

export const COLLEAGUE_FACTOR: Record<string, number> = {
  '亲如一家': 1.2,
  '和和睦睦': 1.1,
  '萍水相逢': 1.0,
  '勾勾搭角': 0.9,
  '乌烟瘴气': 0.8,
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

type RatingConfig<T> = { thresholds: number[]; labels: string[]; colors: string[]; defaultValue?: T };

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
export const LEADER_OPTIONS = ['善解人意', '比较好', '中规中矩', '比较坑', '简直噩梦'] as const;
export const COLLEAGUE_OPTIONS = ['亲如一家', '和和睦睦', '萍水相逢', '勾勾搭角', '乌烟瘴气'] as const;
export const CAFETERIA_OPTIONS = ['丰富且便宜', '不错', '普通', '较差'] as const;
export const LOCATION_PREF_OPTIONS = ['喜欢/离家近', '无所谓', '不太满意/有点远'] as const;

export const MONTHS_PER_YEAR_OPTIONS = [12, 13, 14, 15, 16, 18, 20, 24] as const;
export const ALLOWANCE_OPTIONS = [0, 500, 800, 1000, 1500, 2000, 2500, 3000, 4000, 5000] as const;

export const WORK_DAYS_OPTIONS = [4, 5, 6, 7] as const;
export const WFH_DAYS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const DAILY_HOURS_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export const COMMUTE_HOURS_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3] as const;
export const REST_HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5] as const;

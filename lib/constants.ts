// ── 应届生评测器常量表 ──
// 数据来源：docs/algorithms/fresh-grad-algorithm.md

import type { RatingInfo } from './types';

// ── PPP 因子（中国大陆）──
export const PPP_FACTOR_CHINA = 4.19;

// ── 标准年工作日基准 ──
export const STANDARD_WORKING_DAYS = 260; // 52 周 × 5 天
export const STANDARD_HOURS = 8;

// ── 基础年薪表（万元）──
// Key: `${education}|${schoolLevel}`
export const BASE_ANNUAL_SALARY: Record<string, number> = {
  // 专科及以下
  '专科及以下|无': 6,

  // 本科
  '本科|二本三本': 8,
  '本科|双非一本': 10,
  '本科|985/211': 15,
  '本科|C9/清北': 25,

  // 硕士
  '硕士|二本本科+二本硕士': 10,
  '硕士|双非本科+双非硕士': 12,
  '硕士|211本科+211硕士': 18,
  '硕士|985本科+985硕士': 25,
  '硕士|C9/清北': 35,

  // 博士
  '博士|普通': 18,
  '博士|985/QS50': 30,
  '博士|C9/清北': 45,
};

// ── 城市薪资系数 ──
export const CITY_SALARY_FACTOR: Record<string, number> = {
  '超一线': 1.30,
  '一线': 1.15,
  '新一线': 1.00,
  '二线': 0.85,
  '三线及以下': 0.70,
};

// ── 行业系数 ──
export const INDUSTRY_FACTOR: Record<string, number> = {
  'AI/大模型': 1.40,
  '半导体/芯片': 1.30,
  '互联网/软件': 1.20,
  '新能源/汽车': 1.15,
  '金融/银行': 1.10,
  '医疗/医药': 1.05,
  '消费品/快消': 1.00,
  '制造业': 0.90,
  '教育/培训': 0.80,
  '其他': 0.85,
};

// ── 城市生活成本系数（环境系数子因子）──
export const CITY_LIVING_COST: Record<string, number> = {
  '超一线': 0.60,
  '一线': 0.70,
  '新一线': 0.80,
  '二线': 0.90,
  '三线及以下': 1.00,
};

// ── 工作环境系数 ──
export const WORK_ENV_FACTOR: Record<string, number> = {
  '高端园区': 1.2,
  'CBD/甲级写字楼': 1.1,
  '普通': 1.0,
  '偏远/厂区': 0.9,
  '条件较差': 0.8,
};

// ── 领导关系系数 ──
export const LEADER_FACTOR: Record<string, number> = {
  '善解人意': 1.2,
  '比较好': 1.1,
  '中规中矩': 1.0,
  '比较坑': 0.9,
  '简直噩梦': 0.8,
};

// ── 同事关系系数 ──
export const COLLEAGUE_FACTOR: Record<string, number> = {
  '亲如一家': 1.2,
  '和和睦睦': 1.1,
  '萍水相逢': 1.0,
  '勾勾搭角': 0.9,
  '乌烟瘴气': 0.8,
};

// ── 食堂系数 ──
export const CAFETERIA_FACTOR: Record<string, number> = {
  '丰富且便宜': 1.15,
  '不错': 1.1,
  '普通': 1.0,
  '较差': 0.9,
  '无食堂': 1.0,
};

// ── 班车系数 ──
export const SHUTTLE_FACTOR_HAS = 0.3;
export const SHUTTLE_FACTOR_NO = 1.0;

// ── 评级体系 ──
export const RATINGS: { max: number; info: RatingInfo }[] = [
  {
    max: 0.5,
    info: { label: '大冤种', color: 'text-pink-800', colorHex: '#9d174d', description: '严重低于市场，快跑！' },
  },
  {
    max: 0.7,
    info: { label: '偏低', color: 'text-red-500', colorHex: '#ef4444', description: '明显低于期望' },
  },
  {
    max: 0.9,
    info: { label: '一般', color: 'text-orange-500', colorHex: '#f97316', description: '略低于期望，可以谈谈' },
  },
  {
    max: 1.1,
    info: { label: '合理', color: 'text-blue-500', colorHex: '#3b82f6', description: '符合市场水平' },
  },
  {
    max: 1.3,
    info: { label: '不错', color: 'text-green-500', colorHex: '#22c55e', description: '超出期望' },
  },
  {
    max: 1.6,
    info: { label: '很香', color: 'text-purple-500', colorHex: '#a855f7', description: '远超期望' },
  },
  {
    max: Infinity,
    info: { label: '天选 Offer', color: 'text-yellow-500', colorHex: '#eab308', description: '顶级 offer！' },
  },
];

// ── 学历联动：学校等级选项 ──
export const SCHOOL_OPTIONS: Record<string, string[]> = {
  '专科及以下': ['无'],
  '本科': ['二本三本', '双非一本', '985/211', 'C9/清北'],
  '硕士': ['二本本科+二本硕士', '双非本科+双非硕士', '211本科+211硕士', '985本科+985硕士', 'C9/清北'],
  '博士': ['普通', '985/QS50', 'C9/清北'],
};

// ── 表单选项 ──
export const EDUCATION_OPTIONS = ['专科及以下', '本科', '硕士', '博士'] as const;
export const CITY_TIER_OPTIONS = ['超一线', '一线', '新一线', '二线', '三线及以下'] as const;
export const INDUSTRY_OPTIONS = [
  'AI/大模型', '半导体/芯片', '互联网/软件', '新能源/汽车',
  '金融/银行', '医疗/医药', '消费品/快消', '制造业', '教育/培训', '其他',
] as const;

export const WORK_ENV_OPTIONS = ['高端园区', 'CBD/甲级写字楼', '普通', '偏远/厂区', '条件较差'] as const;
export const LEADER_OPTIONS = ['善解人意', '比较好', '中规中矩', '比较坑', '简直噩梦'] as const;
export const COLLEAGUE_OPTIONS = ['亲如一家', '和和睦睦', '萍水相逢', '勾勾搭角', '乌烟瘴气'] as const;
export const CAFETERIA_OPTIONS = ['丰富且便宜', '不错', '普通', '较差'] as const;

// ── 行业默认年终奖月数（用于期望薪资计算）──
export const INDUSTRY_BONUS_MONTHS: Record<string, number> = {
  'AI/大模型': 4,
  '半导体/芯片': 3.5,
  '互联网/软件': 3,
  '新能源/汽车': 2.5,
  '金融/银行': 3,
  '医疗/医药': 2,
  '消费品/快消': 2,
  '制造业': 1.5,
  '教育/培训': 1,
  '其他': 1.5,
};

export const BONUS_MONTHS_OPTIONS = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6] as const;
export const ALLOWANCE_OPTIONS = [0, 500, 800, 1000, 1500, 2000, 2500, 3000, 4000, 5000] as const;

export const WORK_DAYS_OPTIONS = [4, 5, 6, 7] as const;
export const WFH_DAYS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const DAILY_HOURS_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export const COMMUTE_HOURS_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3] as const;
export const REST_HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5] as const;

// ── 城市示例映射 ──
export const CITY_TIER_EXAMPLES: Record<string, string> = {
  '超一线': '北京、上海、深圳',
  '一线': '广州、杭州',
  '新一线': '成都、武汉、南京、西安',
  '二线': '合肥、济南、福州',
  '三线及以下': '其他城市',
};

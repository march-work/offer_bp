// ── 城市数据加载模块 ──
// 从 public/cities/ 目录下的 JSON 文件加载数据，带缓存

// ── JSON 数据类型定义 ──

export interface DistrictPropertyData {
  unit_price: number;
  unit_price_display: string;
  mom_change: string | null;
  price_range_min: number | null;
  price_range_max: number | null;
  total_price: number | null;
  total_price_display: string | null;
  sell_rent_ratio: number | null;
  price_range_display: string | null;
}

export interface DistrictHousing {
  secondhand: DistrictPropertyData;
  newhome: DistrictPropertyData;
  whole_rent: DistrictPropertyData;
  shared_rent: DistrictPropertyData | null;
}

export interface HousingJson {
  update_time: string;
  data_month: string;
  source: string;
  province: string | null;
  districts: Record<string, DistrictHousing>;
}

export interface IncomeExpenditureJson {
  city: string;
  year: number;
  per_capita_disposable_income: number;
  per_capita_consumption_expenditure: number;
  savings_ratio: number;
  source: string;
  note?: string;
}

export interface IndustrySalaryJson {
  city: string;
  year: number;
  data_source: {
    official_channel: string;
    data_type: string;
    publish_time: string;
  };
  industries: { name: string; annual_average_salary: number; currency: string }[];
}

// ── 聚合数据类型 ──

export interface HousingPrices {
  secondhandPrice: number;  // 万元/㎡
  newhomePrice: number;     // 万元/㎡
  wholeRentPrice: number;   // 元/月/㎡
  sharedRentPrice: number;  // 元/月/㎡
}

export interface CityDataBundle {
  housing: HousingJson;
  income: IncomeExpenditureJson;
  industrySalary: IndustrySalaryJson;
}

import type { CityCalculationData } from './types';

/** 从 CityDataBundle 构建 CityCalculationData（消除页面层重复代码） */
export function buildCityCalcData(
  bundle: CityDataBundle,
  targetDistrict?: string,
): CityCalculationData {
  const avgHousing = computeCityAverageHousing(bundle.housing);
  const industrySalaries = buildIndustrySalaryMap(bundle.industrySalary);

  let housing = avgHousing;
  if (targetDistrict) {
    const districtHousing = getDistrictHousing(bundle.housing, targetDistrict, avgHousing);
    if (districtHousing) housing = districtHousing;
  }

  return {
    income: bundle.income.per_capita_disposable_income,
    consumption: bundle.income.per_capita_consumption_expenditure,
    secondhandPrice: housing.secondhandPrice,
    newhomePrice: housing.newhomePrice,
    wholeRentPrice: housing.wholeRentPrice,
    sharedRentPrice: housing.sharedRentPrice,
    industrySalaries,
  };
}

// ── 缓存 + fetch ──

const cache = new Map<string, unknown>();

async function fetchJSON<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached) return cached as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data as T;
}

// ── 单文件加载 ──

export function loadHousing(city: string): Promise<HousingJson> {
  return fetchJSON<HousingJson>(`/cities/${city}/housing.json`);
}

export function loadIncomeExpenditure(city: string): Promise<IncomeExpenditureJson> {
  return fetchJSON<IncomeExpenditureJson>(`/cities/${city}/income_expenditure.json`);
}

export function loadIndustrySalary(city: string): Promise<IndustrySalaryJson> {
  return fetchJSON<IndustrySalaryJson>(`/cities/${city}/industry_salary.json`);
}

// ── 聚合加载 ──

export async function loadAllCityData(city: string): Promise<CityDataBundle> {
  const [housing, income, industrySalary] = await Promise.all([
    loadHousing(city),
    loadIncomeExpenditure(city),
    loadIndustrySalary(city),
  ]);
  return { housing, income, industrySalary };
}

// ── 工具函数 ──

/** 归一化 unit_price → 万元/㎡（买房）/ 元·月/㎡（租房） */
function normalizePrice(data: DistrictPropertyData | null | undefined, isRent: boolean = false): number | null {
  if (!data || data.unit_price == null) return null;
  const display = data.unit_price_display ?? '';
  // 只有买房时，display 包含"元/㎡"但不包含"万" → 原始值是 元/㎡，需转为 万元/㎡
  if (!isRent && display.includes('元') && !display.includes('万')) {
    return data.unit_price / 10000;
  }
  return data.unit_price;
}

/** 从区县数据计算全市均价 */
export function computeCityAverageHousing(housing: HousingJson): HousingPrices {
  const districts = Object.values(housing.districts);
  const avg = (getter: (d: DistrictHousing) => number | null) => {
    const values = districts.map(getter).filter((v): v is number => v != null);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };
  return {
    secondhandPrice: +avg(d => normalizePrice(d.secondhand, false)).toFixed(2),
    newhomePrice: +avg(d => normalizePrice(d.newhome, false)).toFixed(2),
    wholeRentPrice: +avg(d => normalizePrice(d.whole_rent, true)).toFixed(2),
    sharedRentPrice: +avg(d => normalizePrice(d.shared_rent, true)).toFixed(2),
  };
}

/** 获取某区县的房价数据，null 表示该区县无数据 */
export function getDistrictHousing(
  housing: HousingJson,
  district: string,
  cityAvg?: HousingPrices,
): HousingPrices | null {
  const d = housing.districts[district];
  if (!d) return null;
  const avg = cityAvg ?? computeCityAverageHousing(housing);
  return {
    secondhandPrice: normalizePrice(d.secondhand, false) ?? avg.secondhandPrice,
    newhomePrice: normalizePrice(d.newhome, false) ?? avg.newhomePrice,
    wholeRentPrice: normalizePrice(d.whole_rent, true) ?? avg.wholeRentPrice,
    sharedRentPrice: normalizePrice(d.shared_rent, true) ?? avg.sharedRentPrice,
  };
}

/** 行业薪资数组 → Record */
export function buildIndustrySalaryMap(json: IndustrySalaryJson): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ind of json.industries) {
    map[ind.name] = ind.annual_average_salary;
  }
  return map;
}

/** 通勤：单程分钟 → 日往返小时数，四舍五入到 0.5 */
export function commuteMinutesToDailyHours(minutes: number): number {
  const dailyMinutes = minutes * 2;
  const hours = dailyMinutes / 60;
  return Math.round(hours * 2) / 2;
}

/** 重置缓存（测试用） */
export function resetCache(): void {
  cache.clear();
}

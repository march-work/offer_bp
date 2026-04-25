'use client';

import { useState, useEffect } from 'react';
import { INDUSTRY_OPTIONS, HOT_JOB_MAP, HOT_JOB_INDUSTRIES, TIER1_CITIES, isHotJobIndustry } from '@/lib/constants';

// 内部行业名 → 白皮书显示名 的反向映射
const INTERNAL_TO_DISPLAY: Record<string, string> = {};
for (const h of HOT_JOB_INDUSTRIES) {
  INTERNAL_TO_DISPLAY[h.mappedIndustry] = h.displayName;
}

/** 将 value（可能是显示名或内部名）解析为下拉选项的显示名 */
function resolveDisplayName(value: string): string {
  if (INDUSTRY_OPTIONS.includes(value as typeof INDUSTRY_OPTIONS[number])) return value;
  return INTERNAL_TO_DISPLAY[value] ?? value;
}

interface HotJobIndustry {
  name: string;
  mapped_industry: string;
  positions: { name: string; tier1: number; non_tier1: number }[];
}

interface Props {
  /** 当前选中的行业（可以是白皮书名或内部名） */
  value: string;
  /** 当前选中的职位（空字符串=不限） */
  position: string;
  /** 当前城市（用于判断一线/非一线） */
  city: string;
  /** 行业变更回调，传内部行业名 */
  onIndustryChange: (internalIndustry: string) => void;
  /** 职位变更回调 */
  onPositionChange: (position: string) => void;
  /** 职位参考年薪回调 */
  onPositionSalaryChange?: (salary: number) => void;
}

// 缓存热招数据
let _hotJobCache: { industries: HotJobIndustry[] } | null = null;

async function loadHotJobData(): Promise<{ industries: HotJobIndustry[] } | null> {
  if (_hotJobCache) return _hotJobCache;
  try {
    const res = await fetch('/hot_job_salary.json');
    if (!res.ok) return null;
    const data = await res.json();
    _hotJobCache = data;
    return data;
  } catch {
    return null;
  }
}

function formatSalary(v: number): string {
  return '¥' + v.toLocaleString('zh-CN');
}

function isTier1(city: string): boolean {
  return TIER1_CITIES.includes(city as typeof TIER1_CITIES[number]);
}

export function IndustrySelect({
  value,
  position,
  city,
  onIndustryChange,
  onPositionChange,
  onPositionSalaryChange,
}: Props) {
  const [hotJobData, setHotJobData] = useState<{ industries: HotJobIndustry[] } | null>(null);
  const [selectedDisplayName, setSelectedDisplayName] = useState(() => resolveDisplayName(value));

  useEffect(() => {
    loadHotJobData().then(setHotJobData);
  }, []);

  // 当外部 value 变化时同步 displayName（解析为显示名）
  useEffect(() => {
    setSelectedDisplayName(resolveDisplayName(value));
  }, [value]);

  // 查找当前选中行业对应的白皮书行业数据
  const currentHotJob = hotJobData?.industries.find(
    (ind) => ind.name === selectedDisplayName,
  );

  const tier1 = isTier1(city);
  const hasCity = !!city;

  // 当职位或城市变化时，计算参考薪资
  useEffect(() => {
    if (!currentHotJob || !position) {
      onPositionSalaryChange?.(0);
      return;
    }
    const posData = currentHotJob.positions.find((p) => p.name === position);
    if (!posData) {
      onPositionSalaryChange?.(0);
      return;
    }
    onPositionSalaryChange?.(tier1 ? posData.tier1 : posData.non_tier1);
  }, [currentHotJob, position, tier1, onPositionSalaryChange]);

  function handleIndustryChange(displayName: string) {
    setSelectedDisplayName(displayName);
    // 映射到内部行业名
    const internal = HOT_JOB_MAP[displayName] ?? displayName;
    onIndustryChange(internal);
    // 清除职位
    onPositionChange('');
    onPositionSalaryChange?.(0);
  }

  return (
    <div>
      {/* 第一级：行业选择 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          你的专业
        </label>
        <select
          value={selectedDisplayName}
          onChange={(e) => handleIndustryChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {isHotJobIndustry(opt) ? `${opt} \u{1F4CA}` : opt}
            </option>
          ))}
        </select>
      </div>

      {/* 第二级：职位选择 */}
      {currentHotJob && (
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">
            具体职位{hasCity ? `（${tier1 ? '一线城市' : '非一线城市'}薪资参考）` : ''}
          </label>
          <select
            value={position}
            onChange={(e) => onPositionChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">不限职位（行业平均）</option>
            {currentHotJob.positions.map((pos) => (
              <option key={pos.name} value={pos.name}>
                {pos.name}{hasCity ? `　${formatSalary(tier1 ? pos.tier1 : pos.non_tier1)}/年` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

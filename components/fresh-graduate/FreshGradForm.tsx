'use client';

import type { FreshGradInput } from '@/lib/types';
import {
  SCHOOL_OPTIONS,
  EDUCATION_OPTIONS,
  CITY_TIER_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_ENV_OPTIONS,
  LEADER_OPTIONS,
  COLLEAGUE_OPTIONS,
  CAFETERIA_OPTIONS,
  WORK_DAYS_OPTIONS,
  WFH_DAYS_OPTIONS,
  DAILY_HOURS_OPTIONS,
  COMMUTE_HOURS_OPTIONS,
  REST_HOURS_OPTIONS,
  CITY_TIER_EXAMPLES,
  BONUS_MONTHS_OPTIONS,
  ALLOWANCE_OPTIONS,
} from '@/lib/constants';
import { calculateTotalCompensation } from '@/lib/calculate';

interface Props {
  input: FreshGradInput;
  onChange: (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => void;
}

export function FreshGradForm({ input, onChange }: Props) {
  const schoolOptions = SCHOOL_OPTIONS[input.education] ?? ['无'];

  return (
    <div className="space-y-4">
      {/* ── 个人信息 ── */}
      <FormSection title="个人信息" icon="👤">
        <SelectField
          label="学历"
          value={input.education}
          options={EDUCATION_OPTIONS}
          onChange={(v) => onChange('education', v)}
        />
        <SelectField
          label="学校等级"
          value={input.schoolLevel}
          options={schoolOptions}
          onChange={(v) => onChange('schoolLevel', v)}
          hint={input.education === '硕士' ? '请选择本科+硕士的学校组合' : undefined}
        />
        <SelectField
          label="目标城市"
          value={input.targetCity}
          options={CITY_TIER_OPTIONS}
          onChange={(v) => onChange('targetCity', v)}
          hint={CITY_TIER_EXAMPLES[input.targetCity]}
        />
        <SelectField
          label="目标行业"
          value={input.targetIndustry}
          options={INDUSTRY_OPTIONS}
          onChange={(v) => onChange('targetIndustry', v)}
        />
      </FormSection>

      {/* ── 薪资 ── */}
      <FormSection title="Offer 薪资" icon="💰">
        <NumberField
          label="月薪基数（元/月）"
          value={input.monthlyBaseSalary}
          onChange={(v) => onChange('monthlyBaseSalary', v)}
          min={0}
          step={1000}
          placeholder="如 18000"
        />
        <SelectField
          label="年终奖月数"
          value={input.bonusMonths}
          options={BONUS_MONTHS_OPTIONS}
          onChange={(v) => onChange('bonusMonths', v)}
          hint={input.bonusMonths > 0 ? `${12 + input.bonusMonths}薪` : undefined}
        />
        <NumberField
          label="股票/期权（万元/年）"
          value={input.annualStock}
          onChange={(v) => onChange('annualStock', v)}
          min={0}
          step={1}
          placeholder="如 10，无则填 0"
        />
        <SelectField
          label="月补贴总额（元/月）"
          value={input.monthlyAllowance}
          options={ALLOWANCE_OPTIONS}
          onChange={(v) => onChange('monthlyAllowance', v)}
        />
        <TCPreview input={input} />
      </FormSection>

      {/* ── 工作条件 ── */}
      <FormSection title="工作条件" icon="⏰">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <SelectField
            label="每周工作天数"
            value={input.workDaysPerWeek}
            options={WORK_DAYS_OPTIONS}
            onChange={(v) => onChange('workDaysPerWeek', v)}
          />
          <SelectField
            label="WFH 天数/周"
            value={input.wfhDaysPerWeek}
            options={WFH_DAYS_OPTIONS.filter((d) => d <= input.workDaysPerWeek)}
            onChange={(v) => onChange('wfhDaysPerWeek', v)}
          />
          <NumberField
            label="年假（天）"
            value={input.annualLeave}
            onChange={(v) => onChange('annualLeave', v)}
            min={0}
            max={30}
          />
          <NumberField
            label="法定假日（天）"
            value={input.publicHolidays}
            onChange={(v) => onChange('publicHolidays', v)}
            min={0}
            max={20}
          />
          <NumberField
            label="带薪病假（天）"
            value={input.paidSickLeave}
            onChange={(v) => onChange('paidSickLeave', v)}
            min={0}
            max={15}
          />
        </div>
        <hr className="border-gray-100 my-2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <SelectField
            label="日均工时"
            value={input.dailyWorkHours}
            options={DAILY_HOURS_OPTIONS}
            onChange={(v) => onChange('dailyWorkHours', v)}
            suffix="h"
          />
          <SelectField
            label="每日通勤"
            value={input.commuteHours}
            options={COMMUTE_HOURS_OPTIONS}
            onChange={(v) => onChange('commuteHours', v)}
            suffix="h"
          />
          <SelectField
            label="休息时间"
            value={input.restHours}
            options={REST_HOURS_OPTIONS}
            onChange={(v) => onChange('restHours', v)}
            suffix="h"
          />
        </div>
      </FormSection>

      {/* ── 工作环境 ── */}
      <FormSection title="工作环境" icon="🏢">
        <SelectField
          label="办公环境"
          value={input.workEnvironment}
          options={WORK_ENV_OPTIONS}
          onChange={(v) => onChange('workEnvironment', v)}
        />
        <SelectField
          label="领导关系"
          value={input.leaderRelation}
          options={LEADER_OPTIONS}
          onChange={(v) => onChange('leaderRelation', v)}
        />
        <SelectField
          label="同事关系"
          value={input.colleagueRelation}
          options={COLLEAGUE_OPTIONS}
          onChange={(v) => onChange('colleagueRelation', v)}
        />
        <SelectField
          label="城市生活成本"
          value={input.cityLevel}
          options={CITY_TIER_OPTIONS}
          onChange={(v) => onChange('cityLevel', v)}
          hint={CITY_TIER_EXAMPLES[input.cityLevel]}
        />
        <div className="grid grid-cols-2 gap-x-4">
          <CheckboxField
            label="有班车"
            checked={input.hasShuttle}
            onChange={(v) => onChange('hasShuttle', v)}
          />
          <CheckboxField
            label="有食堂"
            checked={input.hasCafeteria}
            onChange={(v) => onChange('hasCafeteria', v)}
          />
        </div>
        {input.hasCafeteria && (
          <SelectField
            label="食堂质量"
            value={input.cafeteriaQuality ?? '普通'}
            options={CAFETERIA_OPTIONS}
            onChange={(v) => onChange('cafeteriaQuality', v)}
          />
        )}
      </FormSection>
    </div>
  );
}

// ── 子组件 ──

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  suffix,
  hint,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-400">({hint})</span>}
      </label>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = typeof value === 'number' ? (Number(raw) as T) : (raw as T);
          onChange(parsed);
        }}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}{suffix ?? ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
          else onChange(0);
        }}
        min={min}
        max={max}
        step={step ?? 1}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function TCPreview({ input }: { input: FreshGradInput }) {
  const tc = calculateTotalCompensation(input);
  if (tc <= 0) return null;

  const tcWan = (tc / 10000).toFixed(1);
  const parts: string[] = [];
  if (input.monthlyBaseSalary > 0) {
    parts.push(`${(input.monthlyBaseSalary / 1000).toFixed(0)}k×${12 + input.bonusMonths}`);
  }
  if (input.annualStock > 0) {
    parts.push(`股票${input.annualStock}万`);
  }
  if (input.monthlyAllowance > 0) {
    parts.push(`补贴${(input.monthlyAllowance / 1000).toFixed(1)}k×12`);
  }

  return (
    <div className="bg-blue-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">预估年总包 (TC)</div>
      <div className="text-lg font-semibold text-blue-600">{tcWan} 万</div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        = {parts.join(' + ')}
      </div>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

'use client';

import type { FreshGradInput } from '@/lib/types';
import {
  BACHELOR_OPTIONS,
  MASTER_OPTIONS,
  PHD_OPTIONS,
  CITY_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_ENV_OPTIONS,
  LEADER_OPTIONS,
  COLLEAGUE_OPTIONS,
  CAFETERIA_OPTIONS,
  MONTHS_PER_YEAR_OPTIONS,
  ALLOWANCE_OPTIONS,
  WORK_DAYS_OPTIONS,
  WFH_DAYS_OPTIONS,
  DAILY_HOURS_OPTIONS,
  COMMUTE_HOURS_OPTIONS,
  REST_HOURS_OPTIONS,
} from '@/lib/constants';
import { calculateTotalCompensation } from '@/lib/calculate';

interface Props {
  input: FreshGradInput;
  onChange: (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => void;
}

export function FreshGradForm({ input, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* ── 学历 ── */}
      <FormSection title="学历" icon="🎓">
        <EducationSelector
          bachelor={input.bachelorLevel}
          master={input.masterLevel}
          phd={input.phdLevel}
          onChange={(b, m, p) => {
            onChange('bachelorLevel', b);
            onChange('masterLevel', m);
            onChange('phdLevel', p);
          }}
        />
      </FormSection>

      {/* ── 城市 & 行业 ── */}
      <FormSection title="目标" icon="🎯">
        <SelectField
          label="目标城市"
          value={input.targetCity}
          options={CITY_OPTIONS}
          onChange={(v) => onChange('targetCity', v)}
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
          label="月薪（元/月）"
          value={input.monthlyBaseSalary}
          onChange={(v) => onChange('monthlyBaseSalary', v)}
          min={0}
          step={1000}
          placeholder="如 18000"
        />
        <SelectField
          label="一年发几个月"
          value={input.monthsPerYear}
          options={MONTHS_PER_YEAR_OPTIONS}
          onChange={(v) => onChange('monthsPerYear', v)}
          hint={`${input.monthsPerYear}薪`}
        />
        <NumberField
          label="额外年终奖（元）"
          value={input.yearEndBonus}
          onChange={(v) => onChange('yearEndBonus', v)}
          min={0}
          step={1000}
          placeholder="额外的年终奖金额，无则填 0"
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
          label="月补贴（元/月）"
          value={input.monthlyAllowance}
          options={ALLOWANCE_OPTIONS}
          onChange={(v) => onChange('monthlyAllowance', v)}
        />
        <TCPreview input={input} />
      </FormSection>

      {/* ── 工时 ── */}
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

      {/* ── 环境 ── */}
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
          label="食堂质量"
          value={input.cafeteriaQuality ?? '普通'}
          options={CAFETERIA_OPTIONS}
          onChange={(v) => onChange('cafeteriaQuality', v)}
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
      </FormSection>
    </div>
  );
}

// ── 三列学历选择器 ──
function EducationSelector({
  bachelor,
  master,
  phd,
  onChange,
}: {
  bachelor: string;
  master: string;
  phd: string;
  onChange: (b: string, m: string, p: string) => void;
}) {
  const hasMaster = master !== '无' && master !== '直博';
  const hasPhd = phd !== '无';
  const isDirectPhD = (master === '无' || master === '直博') && phd !== '无';

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {/* 本科列 */}
        <div>
          <label className="block text-[10px] text-gray-400 mb-1 text-center">本科</label>
          <div className="space-y-1">
            {BACHELOR_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange(opt.label, '无', '无')}
                className={`w-full text-[11px] px-1.5 py-1 rounded text-left transition-colors ${
                  bachelor === opt.label
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 硕士列 */}
        <div>
          <label className="block text-[10px] text-gray-400 mb-1 text-center">硕士</label>
          <div className="space-y-1">
            {MASTER_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  if (opt.label === '直博') {
                    onChange(bachelor, '无', '双非博士');
                  } else {
                    onChange(bachelor, opt.label, '无');
                  }
                }}
                disabled={hasPhd && opt.label !== '直博'}
                className={`w-full text-[11px] px-1.5 py-1 rounded text-left transition-colors disabled:opacity-40 ${
                  master === opt.label || (opt.label === '直博' && isDirectPhD)
                    ? 'bg-blue-600 text-white font-medium'
                    : !hasMaster && opt.label !== '直博'
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {opt.label}
                {opt.label === '直博' && ' ↲'}
              </button>
            ))}
          </div>
        </div>

        {/* 博士列 */}
        <div>
          <label className="block text-[10px] text-gray-400 mb-1 text-center">博士</label>
          <div className="space-y-1">
            {PHD_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  if (!hasMaster) {
                    onChange(bachelor, '无', opt.label);
                  } else {
                    onChange(bachelor, master, opt.label);
                  }
                }}
                disabled={!hasMaster && master !== '直博' && master !== '无'}
                className={`w-full text-[11px] px-1.5 py-1 rounded text-left transition-colors disabled:opacity-40 ${
                  phd === opt.label
                    ? 'bg-blue-600 text-white font-medium'
                    : phd === '无'
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {isDirectPhD && (
        <div className="text-center mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
            直博
          </span>
        </div>
      )}
    </div>
  );
}

// ── 通用子组件 ──
function FormSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
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
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
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
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
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
    <label className="flex items-center gap-2 cursor-pointer py-2">
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

function TCPreview({ input }: { input: FreshGradInput }) {
  const tc = calculateTotalCompensation(input);
  if (tc <= 0) return null;
  return (
    <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
      <div className="text-xs text-blue-500 mb-1">年总包 TC</div>
      <div className="text-lg font-bold text-blue-700">
        {(tc / 10000).toFixed(1)}万
      </div>
    </div>
  );
}

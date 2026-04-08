'use client';

import { useRef } from 'react';
import type { FreshGradInput } from '@/lib/types';
import type { EvalMode } from '@/app/fresh-graduate/page';
import {
  BACHELOR_OPTIONS,
  MASTER_OPTIONS,
  PHD_OPTIONS,
  CITY_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_ENV_OPTIONS,
  CAFETERIA_OPTIONS,
  LOCATION_PREF_OPTIONS,
  WFH_DAYS_OPTIONS,
  GROWTH_OPTIONS,
  ROLE_CORE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  OVERTIME_CULTURE_OPTIONS,
  SALARY_PAYMENT_OPTIONS,
} from '@/lib/constants';
import { calculateTotalCompensation } from '@/lib/calculate';
import { FormSection } from '@/components/ui/FormSection';
import { SelectField } from '@/components/ui/SelectField';
import { NumberField } from '@/components/ui/NumberField';
import { CheckboxField } from '@/components/ui/CheckboxField';

interface Props {
  input: FreshGradInput;
  onChange: (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => void;
  onCalculate: () => void;
  districts: string[];
  dataLoading: boolean;
  mode: EvalMode;
}

export function FreshGradForm({ input, onChange, onCalculate, districts, dataLoading, mode }: Props) {
  const housingFundManuallyEdited = useRef(false);
  const isQuick = mode === 'quick';

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
      <FormSection title="Offer 地点" icon="🎯">
        <SelectField
          label="Offer城市"
          value={input.targetCity}
          options={CITY_OPTIONS}
          onChange={(v) => onChange('targetCity', v)}
        />
        {districts.length > 0 && (
          <SelectField
            label="Offer区县"
            value={input.targetDistrict ?? ''}
            options={['', ...districts]}
            onChange={(v) => onChange('targetDistrict', v)}
            disabled={dataLoading}
            hint={input.targetDistrict ? undefined : '不选则用城市均价'}
          />
        )}
        <SelectField
          label="你的专业"
          value={input.targetIndustry}
          options={INDUSTRY_OPTIONS}
          onChange={(v) => onChange('targetIndustry', v)}
        />
        {!isQuick && (
          <SelectField
            label="地点偏好"
            value={input.locationPreference}
            options={LOCATION_PREF_OPTIONS}
            onChange={(v) => onChange('locationPreference', v)}
          />
        )}
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
        <NumberField
          label="一年发几个月"
          value={input.monthsPerYear}
          onChange={(v) => onChange('monthsPerYear', v)}
          min={1}
          max={36}
          step={0.5}
          placeholder="默认 12"
        />
        <NumberField
          label="额外年终奖（元）"
          value={input.yearEndBonus}
          onChange={(v) => onChange('yearEndBonus', v)}
          min={0}
          step={1000}
          placeholder="额外的年终奖金额，无则填 0"
        />
        {!isQuick && (
          <NumberField
            label="股票/期权（万元/年）"
            value={input.annualStock}
            onChange={(v) => onChange('annualStock', v)}
            min={0}
            step={1}
            placeholder="如 10，无则填 0"
          />
        )}
        {!isQuick && (
          <NumberField
            label="月补贴（元/月）"
            value={input.monthlyAllowance}
            onChange={(v) => onChange('monthlyAllowance', v)}
            min={0}
            step={100}
            placeholder="如 500，无则填 0"
          />
        )}
        <TCPreview input={input} />
        <div className="grid grid-cols-2 gap-x-4">
          <SelectField
            label="五险"
            value={input.hasSocialInsurance}
            options={['', '有', '无']}
            onChange={(v) => {
              onChange('hasSocialInsurance', v);
              if (v === '有' && !input.socialInsuranceBase) {
                onChange('socialInsuranceBase', input.monthlyBaseSalary);
                if (!housingFundManuallyEdited.current) {
                  onChange('housingFundBase', input.monthlyBaseSalary);
                }
              }
            }}
            hint={!input.hasSocialInsurance ? '请选择' : undefined}
            placeholder="请选择"
          />
          <SelectField
            label="公积金"
            value={input.hasHousingFund}
            options={['', '有', '无']}
            onChange={(v) => {
              onChange('hasHousingFund', v);
              if (v === '有' && !input.housingFundBase) {
                onChange('housingFundBase', input.socialInsuranceBase || input.monthlyBaseSalary);
              }
            }}
            hint={!input.hasHousingFund ? '请选择' : undefined}
            placeholder="请选择"
          />
        </div>
        {input.hasSocialInsurance === '有' && (
          <NumberField
            label="五险基数（元/月）"
            value={input.socialInsuranceBase}
            onChange={(v) => {
              onChange('socialInsuranceBase', v);
              if (!housingFundManuallyEdited.current) {
                onChange('housingFundBase', v);
              }
            }}
            min={0}
            step={100}
            placeholder="默认等于月薪"
          />
        )}
        {input.hasHousingFund === '有' && (
          <NumberField
            label="公积金基数（元/月）"
            value={input.housingFundBase}
            onChange={(v) => {
              housingFundManuallyEdited.current = true;
              onChange('housingFundBase', v);
            }}
            min={0}
            step={100}
            placeholder="默认等于五险基数"
          />
        )}
        {!isQuick && (input.hasSocialInsurance === '有' || input.hasHousingFund === '有') && (
          <CheckboxField
            label="有六险或二金"
            checked={input.hasExtraInsurance}
            onChange={(v) => onChange('hasExtraInsurance', v)}
          />
        )}
        {!isQuick && (
          <SelectField
            label="工资发放时间"
            value={input.salaryPaymentTiming}
            options={SALARY_PAYMENT_OPTIONS}
            onChange={(v) => onChange('salaryPaymentTiming', v)}
          />
        )}
      </FormSection>

      {/* ── 工时 ── */}
      <FormSection title="工作条件" icon="⏰">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <NumberField
            label="每周工作天数"
            value={input.workDaysPerWeek}
            onChange={(v) => onChange('workDaysPerWeek', v)}
            min={1}
            max={7}
            step={0.5}
            placeholder="默认 5"
          />
          {!isQuick && (
            <SelectField
              label="WFH 天数/周"
              value={input.wfhDaysPerWeek}
              options={WFH_DAYS_OPTIONS.filter((d) => d <= input.workDaysPerWeek)}
              onChange={(v) => onChange('wfhDaysPerWeek', v)}
            />
          )}
          <NumberField
            label="年假（天）"
            value={input.annualLeave}
            onChange={(v) => onChange('annualLeave', v)}
            min={0}
            max={30}
          />
          {!isQuick && (
            <NumberField
              label="法定假日（天）"
              value={input.publicHolidays}
              onChange={(v) => onChange('publicHolidays', v)}
              min={0}
              max={20}
            />
          )}
          {!isQuick && (
            <NumberField
              label="带薪病假（天）"
              value={input.paidSickLeave}
              onChange={(v) => onChange('paidSickLeave', v)}
              min={0}
              max={15}
            />
          )}
        </div>
        <hr className="border-gray-100 my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <NumberField
            label="日均工时（小时）"
            value={input.dailyWorkHours}
            onChange={(v) => onChange('dailyWorkHours', v)}
            min={1}
            max={24}
            step={0.5}
          />
          {!isQuick && (
            <NumberField
              label="每日通勤（分钟）"
              value={input.commuteHours * 60}
              onChange={(v) => onChange('commuteHours', v / 60)}
              min={0}
              max={180}
              step={5}
            />
          )}
          <NumberField
            label="休息时间（小时）"
            value={input.restHours}
            onChange={(v) => onChange('restHours', v)}
            min={0}
            max={8}
            step={0.5}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
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

      {/* ── 平台系数 ── */}
      <FormSection title="平台系数" icon="📈">
        {!isQuick && (
          <SelectField
            label="个人发展空间"
            value={input.growthFactor}
            options={GROWTH_OPTIONS}
            onChange={(v) => onChange('growthFactor', v)}
          />
        )}
        {!isQuick && (
          <SelectField
            label="岗位核心程度"
            value={input.roleCoreFactor}
            options={ROLE_CORE_OPTIONS}
            onChange={(v) => onChange('roleCoreFactor', v)}
          />
        )}
        <SelectField
          label="公司规模"
          value={input.companySizeFactor}
          options={COMPANY_SIZE_OPTIONS}
          onChange={(v) => onChange('companySizeFactor', v)}
        />
        <SelectField
          label="加班文化"
          value={input.overtimeCultureFactor}
          options={OVERTIME_CULTURE_OPTIONS}
          onChange={(v) => onChange('overtimeCultureFactor', v)}
        />
      </FormSection>

      {/* ── 桌面端计算按钮 ── */}
      <button
        type="button"
        onClick={onCalculate}
        className="hidden lg:block w-full py-3.5 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] active:bg-blue-800 transition-all shadow-sm"
      >
        开始评测
      </button>

    </div>
  );
}

// ── 三列学历选择器（桌面端按钮 / 移动端下拉） ──
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
      {/* ── 移动端：三行下拉 ── */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div>
          <label className="block text-xs text-gray-500 mb-1">本科</label>
          <select
            value={bachelor}
            onChange={(e) => onChange(e.target.value, '无', '无')}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {BACHELOR_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">硕士</label>
          <select
            value={isDirectPhD ? '直博' : master}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '直博') {
                onChange(bachelor, '无', '双非博士');
              } else if (v === '无') {
                onChange(bachelor, '无', '无');
              } else {
                onChange(bachelor, v, '无');
              }
            }}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="无">无</option>
            {MASTER_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">博士</label>
          <select
            value={phd}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '无') {
                onChange(bachelor, hasMaster ? master : '无', '无');
              } else if (!hasMaster) {
                onChange(bachelor, '无', v);
              } else {
                onChange(bachelor, master, v);
              }
            }}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="无">无</option>
            {PHD_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        </div>
        {isDirectPhD && (
          <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 self-start">
            直博
          </span>
        )}
      </div>

      {/* ── 桌面端：三列按钮 ── */}
      <div className="hidden sm:block">
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
    </div>
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

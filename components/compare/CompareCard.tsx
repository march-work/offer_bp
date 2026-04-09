'use client';

import { useMemo } from 'react';
import type { FreshGradInput, FreshGradResult } from '@/lib/types';
import { calculateTotalCompensation } from '@/lib/calculate';
import {
  CITY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  OVERTIME_CULTURE_OPTIONS,
} from '@/lib/constants';
import { FormSection } from '@/components/ui/FormSection';
import { SelectField } from '@/components/ui/SelectField';
import { NumberField } from '@/components/ui/NumberField';

interface Props {
  label: string;
  input: FreshGradInput;
  result: FreshGradResult | null;
  onLabelChange: (label: string) => void;
  onInputChange: (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => void;
  onCalculate: () => void;
  onRemove: () => void;
  districts: string[];
  dataLoading: boolean;
  mode: 'quick' | 'detailed';
  onModeChange: (mode: 'quick' | 'detailed') => void;
}

export function CompareCard({
  label,
  input,
  result,
  onLabelChange,
  onInputChange,
  onCalculate,
  onRemove,
  districts,
  dataLoading,
  mode,
  onModeChange,
}: Props) {
  const isQuick = mode === 'quick';
  const tc = useMemo(() => calculateTotalCompensation(input), [input]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-w-[280px]">
      {/* 头部: 名称 + 删除 */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Offer 名称，如 字节-后端"
          className="flex-1 text-sm font-semibold text-gray-900 placeholder:text-gray-300 border-b border-transparent focus:border-blue-400 outline-none py-0.5 bg-transparent"
        />
        {/* per-card mode toggle button */}
        <button
          type="button"
          onClick={() => onModeChange(mode === 'quick' ? 'detailed' : 'quick')}
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
            mode === 'quick' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          }`}
          title="切换极速版/详细版"
        >
          {mode === 'quick' ? '极速' : '详细'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
          title="删除"
        >
          ×
        </button>
      </div>

      {/* 紧凑表单 */}
      <div className="px-4 pb-4 space-y-3 flex-1">
        {/* 地点 */}
        <FormSection title="地点" icon="📍">
          <SelectField
            label="城市"
            value={input.targetCity}
            options={CITY_OPTIONS}
            onChange={(v) => onInputChange('targetCity', v)}
          />
          {districts.length > 0 && (
            <SelectField
              label="区县"
              value={input.targetDistrict ?? ''}
              options={['', ...districts]}
              onChange={(v) => onInputChange('targetDistrict', v)}
              disabled={dataLoading}
              hint={input.targetDistrict ? undefined : '不选则用城市均价'}
            />
          )}
        </FormSection>

        {/* 薪资 */}
        <FormSection title="薪资" icon="💰">
          <NumberField
            label="月薪（元）"
            value={input.monthlyBaseSalary}
            onChange={(v) => onInputChange('monthlyBaseSalary', v)}
            min={0}
            step={1000}
            placeholder="如 18000"
          />
          <div className="grid grid-cols-2 gap-x-3">
            <NumberField
              label="发几个月"
              value={input.monthsPerYear}
              onChange={(v) => onInputChange('monthsPerYear', v)}
              min={1}
              max={36}
              step={0.5}
            />
            <NumberField
              label="年终奖（元）"
              value={input.yearEndBonus}
              onChange={(v) => onInputChange('yearEndBonus', v)}
              min={0}
              step={1000}
            />
          </div>
          {!isQuick && (
            <div className="grid grid-cols-2 gap-x-3">
              <NumberField
                label="股票（万/年）"
                value={input.annualStock}
                onChange={(v) => onInputChange('annualStock', v)}
                min={0}
                step={1}
              />
              <NumberField
                label="月补贴（元）"
                value={input.monthlyAllowance}
                onChange={(v) => onInputChange('monthlyAllowance', v)}
                min={0}
                step={100}
              />
            </div>
          )}
          {/* 五险公积金 */}
          <div className="grid grid-cols-2 gap-x-3">
            <SelectField
              label="五险"
              value={input.hasSocialInsurance}
              options={['有', '无']}
              onChange={(v) => {
                onInputChange('hasSocialInsurance', v);
                if (v === '有' && !input.socialInsuranceBase) {
                  onInputChange('socialInsuranceBase', input.monthlyBaseSalary);
                  onInputChange('housingFundBase', input.monthlyBaseSalary);
                }
              }}
            />
            <SelectField
              label="公积金"
              value={input.hasHousingFund}
              options={['有', '无']}
              onChange={(v) => {
                onInputChange('hasHousingFund', v);
                if (v === '有' && !input.housingFundBase) {
                  onInputChange('housingFundBase', input.socialInsuranceBase || input.monthlyBaseSalary);
                }
              }}
            />
          </div>
          {input.hasSocialInsurance === '有' && (
            <NumberField
              label="五险基数（元）"
              value={input.socialInsuranceBase}
              onChange={(v) => {
                onInputChange('socialInsuranceBase', v);
                onInputChange('housingFundBase', v);
              }}
              min={0}
              step={100}
            />
          )}
          {/* TC 预览 */}
          {tc > 0 && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
              <div className="text-[10px] text-blue-500">年总包 TC</div>
              <div className="text-sm font-bold text-blue-700">{(tc / 10000).toFixed(1)}万</div>
            </div>
          )}
        </FormSection>

        {/* 工时 */}
        <FormSection title="工时" icon="⏰">
          <div className="grid grid-cols-2 gap-x-3">
            <NumberField
              label="周工作天数"
              value={input.workDaysPerWeek}
              onChange={(v) => onInputChange('workDaysPerWeek', v)}
              min={1}
              max={7}
              step={0.5}
            />
            <NumberField
              label="日均工时"
              value={input.dailyWorkHours}
              onChange={(v) => onInputChange('dailyWorkHours', v)}
              min={1}
              max={24}
              step={0.5}
            />
          </div>
          {!isQuick && (
            <div className="grid grid-cols-2 gap-x-3">
              <NumberField
                label="通勤（分钟）"
                value={input.commuteHours * 60}
                onChange={(v) => onInputChange('commuteHours', v / 60)}
                min={0}
                max={180}
                step={5}
              />
              <NumberField
                label="年假（天）"
                value={input.annualLeave}
                onChange={(v) => onInputChange('annualLeave', v)}
                min={0}
                max={30}
              />
            </div>
          )}
        </FormSection>

        {/* 平台 */}
        <FormSection title="平台" icon="📈">
          <SelectField
            label="公司规模"
            value={input.companySizeFactor}
            options={COMPANY_SIZE_OPTIONS}
            onChange={(v) => onInputChange('companySizeFactor', v)}
          />
          <SelectField
            label="加班文化"
            value={input.overtimeCultureFactor}
            options={OVERTIME_CULTURE_OPTIONS}
            onChange={(v) => onInputChange('overtimeCultureFactor', v)}
          />
        </FormSection>
      </div>

      {/* 底部: 结果/计算按钮 */}
      <div className="px-4 pb-4">
        {result ? (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${result.rating.color} tabular-nums`}>
              {result.score.toFixed(2)}
            </div>
            <div className={`text-sm font-semibold ${result.rating.color}`}>
              {result.rating.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              TC {(result.totalCompensation / 10000).toFixed(1)}万 · 日薪 ¥{result.dailySalary.toFixed(0)}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCalculate}
            disabled={tc <= 0}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tc > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {tc > 0 ? '计算评分' : '请填写月薪'}
          </button>
        )}
      </div>
    </div>
  );
}

import { useRef, useCallback } from 'react';
import type { FreshGradInput } from './types';

type InputChangeHandler = (field: keyof FreshGradInput, value: FreshGradInput[keyof FreshGradInput]) => void;

/**
 * 五险/公积金基数联动 hook
 * - 选择"有五险"时自动填充五险基数（默认=月薪）
 * - 五险基数变更时同步公积金基数（除非用户手动编辑过公积金）
 * - 选择"有公积金"时自动填充公积金基数
 */
export function useInsuranceSync(
  input: FreshGradInput,
  onChange: InputChangeHandler,
) {
  const housingFundManuallyEdited = useRef(false);

  const handleSocialInsuranceSelect = useCallback((v: string) => {
    onChange('hasSocialInsurance', v);
    if (v === '有') {
      onChange('socialInsuranceBase', input.socialInsuranceBase || input.monthlyBaseSalary);
      if (!housingFundManuallyEdited.current) {
        onChange('housingFundBase', input.housingFundBase || input.socialInsuranceBase || input.monthlyBaseSalary);
      }
    }
  }, [input.socialInsuranceBase, input.monthlyBaseSalary, input.housingFundBase, onChange]);

  const handleHousingFundSelect = useCallback((v: string) => {
    onChange('hasHousingFund', v);
    if (v === '有') {
      onChange('housingFundBase', input.housingFundBase || input.socialInsuranceBase || input.monthlyBaseSalary);
    }
  }, [input.housingFundBase, input.socialInsuranceBase, input.monthlyBaseSalary, onChange]);

  const handleSocialInsuranceBaseChange = useCallback((v: number) => {
    onChange('socialInsuranceBase', v);
    if (!housingFundManuallyEdited.current) {
      onChange('housingFundBase', v);
    }
  }, [onChange]);

  const handleHousingFundBaseChange = useCallback((v: number) => {
    housingFundManuallyEdited.current = true;
    onChange('housingFundBase', v);
  }, [onChange]);

  return {
    handleSocialInsuranceSelect,
    handleHousingFundSelect,
    handleSocialInsuranceBaseChange,
    handleHousingFundBaseChange,
  };
}

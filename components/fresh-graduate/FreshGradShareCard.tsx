'use client';

import type { FreshGradInput, FreshGradResult } from '@/lib/types';
import { calculateTotalCompensation } from '@/lib/calculate';

interface Props {
  input: FreshGradInput;
  result: FreshGradResult;
}

export function FreshGradShareCard({ input, result }: Props) {
  const { score, rating, dailySalary, expectedDailySalary, expectedAnnualSalary, totalCompensation, envFactor, effectiveHours, workingDays } = result;

  const salaryRatio = dailySalary / expectedDailySalary;
  const tcWan = (totalCompensation / 10000).toFixed(1);
  const expectedWan = (expectedAnnualSalary / 10000).toFixed(1);

  // 7 维度个性化评价
  const evaluations = generateEvaluations(input, result);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* 顶部 */}
      <div className="px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${rating.colorHex}15, ${rating.colorHex}05)` }}>
        <div className="text-sm text-gray-400 mb-2">Offer BP 评测</div>
        <div className="text-6xl font-black mb-2" style={{ color: rating.colorHex }}>
          {score.toFixed(2)}
        </div>
        <div className="text-2xl font-bold mb-1" style={{ color: rating.colorHex }}>
          {rating.label}
        </div>
        <div className="text-sm text-gray-500">{rating.description}</div>
      </div>

      {/* 薪资概要 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-400">年总包 TC</div>
            <div className="text-lg font-bold text-gray-900">{tcWan}万</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">期望 TC</div>
            <div className="text-lg font-bold text-gray-500">{expectedWan}万</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">达成率</div>
            <div className="text-lg font-bold" style={{ color: salaryRatio >= 1 ? '#22c55e' : '#f97316' }}>
              {(salaryRatio * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* 详细维度 */}
      <div className="px-6 py-4 space-y-3">
        {evaluations.map((ev, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-lg mt-0.5">{ev.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{ev.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ev.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 公式拆解 */}
      <div className="px-6 py-3 bg-gray-50 text-xs font-mono text-gray-400">
        <div>日薪 = {dailySalary.toFixed(0)}</div>
        <div>环境 = {envFactor.toFixed(4)}</div>
        <div>有效工时 = {effectiveHours.toFixed(2)}h</div>
        <div>期望日薪 = {expectedDailySalary.toFixed(0)}</div>
        <div className="mt-1 text-gray-600">
          Score = ({dailySalary.toFixed(0)} × {envFactor.toFixed(4)} × 8) / ({expectedDailySalary.toFixed(0)} × {effectiveHours.toFixed(2)}) = {score.toFixed(2)}
        </div>
      </div>

      {/* 底部 */}
      <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">Offer BP — 这offer接不接？</span>
        <span className="text-xs text-gray-300">{new Date().toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  );
}

function generateEvaluations(input: FreshGradInput, result: FreshGradResult) {
  const evs: { icon: string; title: string; content: string }[] = [];
  const { score, dailySalary, expectedDailySalary, envFactor, effectiveHours } = result;

  // 1. 最终评估
  if (score >= 1.3) {
    evs.push({ icon: '🏆', title: '最终评估', content: `得分 ${score.toFixed(2)}，远超市场期望 ${(score * 100 - 100).toFixed(0)}%，非常好！` });
  } else if (score >= 1.0) {
    evs.push({ icon: '👍', title: '最终评估', content: `得分 ${score.toFixed(2)}，基本符合市场水平，可以考虑接受。` });
  } else if (score >= 0.7) {
    evs.push({ icon: '🤔', title: '最终评估', content: `得分 ${score.toFixed(2)}，低于市场期望 ${((1 - score) * 100).toFixed(0)}%，建议谈一谈。` });
  } else {
    evs.push({ icon: '🏃', title: '最终评估', content: `得分 ${score.toFixed(2)}，严重低于市场期望，建议继续寻找。` });
  }

  // 2. 薪资评价
  const ratio = dailySalary / expectedDailySalary;
  if (ratio >= 1.3) {
    evs.push({ icon: '💰', title: '薪资评价', content: `日薪超出同背景期望 30%+，在同级中属于高水平。` });
  } else if (ratio >= 1.0) {
    evs.push({ icon: '💵', title: '薪资评价', content: `日薪达到同背景期望水平，薪资合理。` });
  } else {
    evs.push({ icon: '📉', title: '薪资评价', content: `日薪低于同背景期望 ${((1 - ratio) * 100).toFixed(0)}%，薪资偏低。` });
  }

  // 3. 工时评价
  if (effectiveHours <= 9) {
    evs.push({ icon: '☕', title: '工时评价', content: `有效日工时 ${effectiveHours.toFixed(1)}h，工作节奏合理，有生活空间。` });
  } else if (effectiveHours <= 11) {
    evs.push({ icon: '⏰', title: '工时评价', content: `有效日工时 ${effectiveHours.toFixed(1)}h，偏忙但尚可接受。` });
  } else {
    evs.push({ icon: '😫', title: '工时评价', content: `有效日工时 ${effectiveHours.toFixed(1)}h，工作强度大，注意身体健康。` });
  }

  // 4. 环境评价
  if (envFactor >= 1.1) {
    evs.push({ icon: '🌟', title: '环境评价', content: `环境系数 ${envFactor.toFixed(2)}，工作环境不错，人际关系良好。` });
  } else if (envFactor >= 0.85) {
    evs.push({ icon: '🏢', title: '环境评价', content: `环境系数 ${envFactor.toFixed(2)}，中规中矩。` });
  } else {
    evs.push({ icon: '😬', title: '环境评价', content: `环境系数 ${envFactor.toFixed(2)}，环境/关系有改善空间。` });
  }

  // 5. WFH 评价
  if (input.wfhDaysPerWeek >= 2) {
    evs.push({ icon: '🏠', title: '远程办公', content: `每周 ${input.wfhDaysPerWeek} 天 WFH，灵活性不错。` });
  } else if (input.wfhDaysPerWeek === 0) {
    evs.push({ icon: '🚇', title: '通勤', content: `无 WFH，每天通勤 ${input.commuteHours}h。` });
  }

  // 6. 行动建议
  if (score >= 1.3) {
    evs.push({ icon: '✅', title: '行动建议', content: '强烈建议接受，这是一份不错的 offer。' });
  } else if (score >= 1.0) {
    evs.push({ icon: '🤝', title: '行动建议', content: '可以考虑接受，也可以尝试谈谈薪资。' });
  } else if (score >= 0.7) {
    evs.push({ icon: '💬', title: '行动建议', content: '建议谈判薪资或继续寻找其他机会。' });
  } else {
    evs.push({ icon: '🚫', title: '行动建议', content: '建议继续寻找，这个 offer 性价比不高。' });
  }

  return evs;
}

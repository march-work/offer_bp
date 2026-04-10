'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCompareItems } from '@/lib/compare-store';

export default function HomePage() {
  const [freshExpanded, setFreshExpanded] = useState(false);
  const compareItems = useCompareItems();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 animate-[fadeIn_400ms_ease-out]">
      {/* 标题区 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
          Offer <span className="text-blue-600">BP</span>
        </h1>
        <p className="text-lg text-gray-500">
          这 offer 接不接？这槽跳不跳？
        </p>
      </div>

      {/* 场景选择 */}
      <div className="w-full max-w-2xl space-y-4">
        {/* 应届生 — 点击分裂成两个 */}
        {!freshExpanded && (
          <button
            type="button"
            onClick={() => setFreshExpanded(true)}
            className="group w-full text-left block rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-blue-300 active:scale-[0.985] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎓</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  应届生 Offer 评测
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  第一次接 offer，不知道这个数在市场上什么水平？
                </p>
              </div>
            </div>
          </button>
        )}

        {freshExpanded && (
          <div className="grid grid-cols-2 gap-3 animate-[splitIn_300ms_ease-out]">
            <Link
              href="/fresh-graduate?mode=quick"
              className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-green-400 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                  极速版
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                  2 分钟
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                核心薪资 + 城市 + 工时，快速出分
              </p>
              <div className="text-xs font-medium text-green-600">
                开始评测 →
              </div>
            </Link>

            <Link
              href="/fresh-graduate?mode=detailed"
              className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  详细版
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  5 分钟
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                全维度量化，含通勤、公积金、平台系数等
              </p>
              <div className="text-xs font-medium text-blue-600">
                开始评测 →
              </div>
            </Link>

            {/* 收起按钮 */}
            <button
              type="button"
              onClick={() => setFreshExpanded(false)}
              className="col-span-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              收起
            </button>
          </div>
        )}

        {/* Offer 对比 */}
        <Link
          href="/compare"
          className="group block rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Offer 对比
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  输入多个 offer，逐维度量化对比，一眼看出哪个更值得接。
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-xs font-medium text-blue-600 group-hover:text-blue-700">
                开始对比 →
              </div>
              {compareItems.length > 0 && (
                <div className="text-[10px] text-gray-400 mt-1">
                  已有 {compareItems.length} 个 offer
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* 跳槽（即将上线） */}
        <div className="block rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💼</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                跳槽决策评测
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                年薪多了 5 万，但公积金少了、通勤远了？量化对比两个 offer 的真实价值。
              </p>
              <div className="mt-2 text-sm font-medium text-gray-400">
                即将上线
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="mt-16 text-center text-xs text-gray-400 max-w-md">
        <p>
          数据仅供参考，实际决策请结合个人情况综合考虑。
          期望薪资基于 2024-2025 校招市场数据。
        </p>
      </div>
    </div>
  );
}

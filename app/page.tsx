import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* 标题区 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
          Offer <span className="text-blue-600">BP</span>
        </h1>
        <p className="text-lg text-gray-500">
          这 offer 接不接？这槽跳不跳？
        </p>
      </div>

      {/* 场景选择 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* 应届生 */}
        <Link
          href="/fresh-graduate"
          className="group block rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="text-3xl mb-4">🎓</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            应届生 Offer 评测
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            第一次接 offer，不知道这个数在市场上什么水平？
            输入背景和 offer 详情，帮你量化分析。
          </p>
          <div className="mt-4 text-sm font-medium text-blue-600">
            开始评测 →
          </div>
        </Link>

        {/* 跳槽（即将上线） */}
        <div className="block rounded-xl border border-gray-200 bg-white p-8 shadow-sm opacity-60 cursor-not-allowed">
          <div className="text-3xl mb-4">💼</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            跳槽决策评测
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            年薪多了 5 万，但公积金少了、通勤远了？
            量化对比两个 offer 的真实价值。
          </p>
          <div className="mt-4 text-sm font-medium text-gray-400">
            即将上线
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

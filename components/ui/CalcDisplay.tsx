'use client';
import { useState } from 'react';

/** 可展开的计算节点（支持无限嵌套） */
export function CalcNode({
  label,
  value,
  children,
  borderColor = 'border-gray-200',
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  borderColor?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pl-2 border-l-2 ${borderColor} ml-1`}>
      <button
        type="button"
        onClick={() => children && setOpen(!open)}
        className={`w-full py-1.5 flex items-center justify-between text-left rounded transition-colors px-2 ${children ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
      >
        <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
          {children && (
            <span className={`text-[10px] text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
          )}
          {label}
        </span>
        <span className="text-sm font-mono text-gray-700">{value}</span>
      </button>
      {children && (
        <div className={`expand-grid ${!open ? 'expand-closed' : ''}`}>
          <div className="expand-inner">
            <div className="pb-1">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 叶子节点（不可展开，显示公式和值） */
export function CalcLeaf({
  label,
  value,
  formula,
}: {
  label: string;
  value?: string;
  formula?: string;
}) {
  return (
    <div className="text-[11px] text-gray-500 py-0.5 px-2 ml-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0">{label}</span>
        {value && <span className="font-mono text-gray-600 shrink-0">{value}</span>}
      </div>
      {formula && <div className="font-mono text-gray-400 break-all mt-0.5">{formula}</div>}
    </div>
  );
}

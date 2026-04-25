'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { CompareItem, SharedFields, FreshGradInput, FreshGradResult } from './types';

// ── 常量 ──

const STORAGE_KEY = 'offer_bp_compare';
const MAX_COMPARE_ITEMS = 5;

// ── Context 类型 ──

interface CompareState {
  items: CompareItem[];
  sharedFields: SharedFields;
}

interface CompareActions {
  addItem: (label: string, input: FreshGradInput, result: FreshGradResult, id?: string) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Pick<CompareItem, 'label' | 'input' | 'result'>>) => void;
  setSharedFields: (fields: SharedFields) => void;
}

type CompareContextType = CompareState & CompareActions;

const CompareContext = createContext<CompareContextType | null>(null);

// ── 默认共享字段 ──

export const DEFAULT_SHARED_FIELDS: SharedFields = {
  bachelorLevel: '双非',
  masterLevel: '无',
  phdLevel: '无',
  targetIndustry: '互联网',
  targetPosition: '',
};

// ── 工具函数 ──

export function generateId(): string {
  return `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): CompareState {
  if (typeof window === 'undefined') {
    return { items: [], sharedFields: DEFAULT_SHARED_FIELDS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], sharedFields: DEFAULT_SHARED_FIELDS };
    const parsed = JSON.parse(raw) as CompareState;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sharedFields: parsed.sharedFields ?? DEFAULT_SHARED_FIELDS,
    };
  } catch {
    return { items: [], sharedFields: DEFAULT_SHARED_FIELDS };
  }
}

function saveToStorage(state: CompareState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage 满了或不可用，静默失败
  }
}

// ── Provider ──

export function CompareProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompareState>({ items: [], sharedFields: DEFAULT_SHARED_FIELDS });
  const initialized = useRef(false);

  // 首次挂载从 localStorage 加载
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setState(loadFromStorage());
    }
  }, []);

  // 每次 state 变化时持久化
  useEffect(() => {
    if (initialized.current) {
      saveToStorage(state);
    }
  }, [state]);

  const addItem = useCallback((label: string, input: FreshGradInput, result: FreshGradResult, id?: string) => {
    setState((prev) => {
      if (prev.items.length >= MAX_COMPARE_ITEMS) return prev;
      const newItem: CompareItem = {
        id: id ?? generateId(),
        label,
        input: { ...input },
        result: { ...result },
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Pick<CompareItem, 'label' | 'input' | 'result'>>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }, []);

  const setSharedFields = useCallback((fields: SharedFields) => {
    setState((prev) => ({ ...prev, sharedFields: fields }));
  }, []);

  return (
    <CompareContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateItem,
        setSharedFields,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

// ── Hook ──

export function useCompareStore(): CompareContextType {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompareStore must be used within a CompareProvider');
  }
  return ctx;
}

/** 只读取数据（不触发 error boundary） */
export function useCompareItems(): CompareItem[] {
  const ctx = useContext(CompareContext);
  return ctx?.items ?? [];
}

export { MAX_COMPARE_ITEMS };

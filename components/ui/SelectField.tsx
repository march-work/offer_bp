interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  suffix,
  hint,
  disabled,
  placeholder,
}: SelectFieldProps<T>) {
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
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}{suffix ?? ''}
          </option>
        ))}
      </select>
    </div>
  );
}

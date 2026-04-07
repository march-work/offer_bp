interface FormSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function FormSection({ title, icon, children }: FormSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

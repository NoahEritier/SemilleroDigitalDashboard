export default function EmptyState({ title = 'No data', subtitle = 'Try a different selection or load data.' }) {
  return (
    <div className="border rounded p-6 text-center text-slate-600">
      <div className="font-medium text-slate-800">{title}</div>
      <div className="text-sm mt-1">{subtitle}</div>
    </div>
  );
}

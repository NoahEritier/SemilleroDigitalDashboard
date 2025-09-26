export default function AlertBanner({ type = 'info', title, message, onClose, actionLabel, onAction }) {
  const palette = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800'
    }
  };
  const colors = palette[type] || palette.info;

  return (
    <div className={`rounded border ${colors.bg} ${colors.border} p-3`} role="alert">
      <div className={`font-medium ${colors.text}`}>{title}</div>
      {message && <div className="text-sm mt-1">{message}</div>}
      <div className="mt-2 flex gap-2">
        {onAction && actionLabel && (
          <button onClick={onAction} className={`text-xs px-2 py-1 rounded ${colors.text} border ${colors.border} hover:bg-white/40`}>{actionLabel}</button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-xs underline">Cerrar</button>
        )}
      </div>
    </div>
  );
}

export default function MetricCard({ label, value, sub, trend, icon, color = 'blue' }) {
  const colors = {
    blue:   'text-blue-400   border-blue-500/20   bg-blue-500/5',
    green:  'text-green-400  border-green-500/20  bg-green-500/5',
    yellow: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
    red:    'text-red-400    border-red-500/20    bg-red-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  };

  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-500';
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value ?? '—'}</p>
      <div className="mt-1 flex items-center gap-2">
        {sub   && <span className="text-xs text-gray-500">{sub}</span>}
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendArrow} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

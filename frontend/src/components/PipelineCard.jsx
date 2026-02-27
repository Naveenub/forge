import StatusBadge from './StatusBadge';
import { formatRelative, formatDuration, truncate } from '../utils/formatters';

const DOMAIN_ORDER = ['architecture', 'development', 'testing', 'security', 'devops'];

export default function PipelineCard({ pipeline, onClick }) {
  const { id, name, status, current_domain, created_at, duration_ms, requirements } = pipeline;

  const domainProgress = DOMAIN_ORDER.findIndex((d) => d === current_domain);
  const pct = status === 'completed' ? 100
    : domainProgress < 0 ? 0
    : Math.round(((domainProgress + 0.5) / DOMAIN_ORDER.length) * 100);

  return (
    <div
      onClick={() => onClick?.(pipeline)}
      className="group rounded-xl border border-white/5 bg-white/3 p-4 cursor-pointer
                 hover:border-white/10 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name || `Pipeline ${id.slice(0, 8)}`}</p>
          {requirements && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{truncate(requirements, 60)}</p>
          )}
        </div>
        <StatusBadge status={status} pulse />
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="capitalize">{current_domain || 'queued'}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Domain dots */}
      <div className="mt-3 flex gap-1.5">
        {DOMAIN_ORDER.map((d, i) => {
          const done    = i < domainProgress || status === 'completed';
          const current = d === current_domain && status === 'running';
          return (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                done    ? 'bg-green-400'  :
                current ? 'bg-blue-400 animate-pulse' :
                          'bg-white/10'
              }`} />
              <span className="text-[9px] text-gray-600 capitalize hidden sm:block">
                {d.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        {created_at  && <span>{formatRelative(created_at)}</span>}
        {duration_ms && <span>· {formatDuration(duration_ms)}</span>}
      </div>
    </div>
  );
}

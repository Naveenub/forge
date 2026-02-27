import StatusBadge from './StatusBadge';
import { formatRelative, formatDuration } from '../utils/formatters';

const DOMAIN_ICONS = {
  architecture: '🏛',
  development:  '⚙️',
  testing:      '🧪',
  security:     '🛡',
  devops:       '🚀',
};

export default function AgentCard({ agent }) {
  const {
    name, domain, stage, status,
    current_task, started_at, duration_ms,
    tokens_used, model,
  } = agent;

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-4 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{DOMAIN_ICONS[domain] || '🤖'}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-gray-500 capitalize">{domain} · {stage}</p>
          </div>
        </div>
        <StatusBadge status={status} pulse />
      </div>

      {current_task && (
        <p className="mt-3 text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {current_task}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        {started_at && (
          <span>Started {formatRelative(started_at)}</span>
        )}
        {duration_ms !== undefined && (
          <span>Duration {formatDuration(duration_ms)}</span>
        )}
        {tokens_used !== undefined && (
          <span>{tokens_used.toLocaleString()} tokens</span>
        )}
        {model && (
          <span className="truncate">{model}</span>
        )}
      </div>
    </div>
  );
}

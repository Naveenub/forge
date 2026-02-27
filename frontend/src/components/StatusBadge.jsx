import { getStatusColor, formatStatus } from '../utils/formatters';

export default function StatusBadge({ status, size = 'sm', pulse = false }) {
  const colors = getStatusColor(status);
  const sizes  = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : size === 'md'
    ? 'px-2.5 py-1 text-sm'
    : 'px-3 py-1.5 text-base';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizes} ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${pulse && status === 'running' ? 'animate-pulse' : ''}`} />
      {formatStatus(status)}
    </span>
  );
}

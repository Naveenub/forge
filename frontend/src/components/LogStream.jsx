import { useEffect, useRef } from 'react';
import { formatDateTime } from '../utils/formatters';

const LEVEL_COLORS = {
  info:    'text-gray-300',
  debug:   'text-gray-500',
  warn:    'text-yellow-400',
  warning: 'text-yellow-400',
  error:   'text-red-400',
  success: 'text-green-400',
};

export default function LogStream({ logs = [], autoScroll = true, maxHeight = '400px' }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  if (!logs.length) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-gray-600 font-mono">
        Waiting for agent output…
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto font-mono text-xs leading-relaxed bg-black/30 rounded-lg p-3"
      style={{ maxHeight }}
    >
      {logs.map((log, i) => {
        const color = LEVEL_COLORS[log.level?.toLowerCase()] || LEVEL_COLORS.info;
        return (
          <div key={i} className="flex gap-2 hover:bg-white/3 px-1 rounded">
            {log.timestamp && (
              <span className="text-gray-600 flex-shrink-0 select-none">
                {formatDateTime(log.timestamp).split(',')[1]?.trim() || ''}
              </span>
            )}
            {log.agent && (
              <span className="text-indigo-400 flex-shrink-0 font-semibold">
                [{log.agent}]
              </span>
            )}
            <span className={color}>{log.message}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

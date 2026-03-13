import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Status = 'connected' | 'connecting' | 'disconnected'

interface StatusConfig {
  color: string
  label: string
  hint?: string
  pulse?: boolean
}

interface ConnectionStatusProps {
  gatewayStatus: Status
  className?: string
}

function computeConfig(status: Status): StatusConfig {
  switch (status) {
    case 'connected':
      return { color: 'bg-[var(--accent)]', label: '已连接' }
    case 'connecting':
      return { color: 'bg-[var(--warning)]', label: '连接中…', pulse: true }
    case 'disconnected':
      return { color: 'bg-[var(--danger)]', label: '未连接', hint: 'Gateway 断开' }
  }
}

export default function ConnectionStatus({ gatewayStatus, className }: ConnectionStatusProps) {
  const cfg = computeConfig(gatewayStatus)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={gatewayStatus}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn('flex items-center gap-2 px-3 py-1.5 text-xs', className)}
      >
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            cfg.color,
            cfg.pulse && 'animate-pulse',
          )}
        />
        <span className="text-[var(--text-muted)]">
          {cfg.label}
          {cfg.hint && (
            <span className="ml-1 text-[var(--text-muted)] opacity-60">({cfg.hint})</span>
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}

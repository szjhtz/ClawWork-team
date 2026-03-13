import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion as motionPresets } from '@/styles/design-tokens'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/uiStore'

interface SettingsProps {
  onClose: () => void
}

export default function Settings({ onClose }: SettingsProps) {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const [gatewayUrl, setGatewayUrl] = useState('ws://127.0.0.1:18789')
  const [bootstrapToken, setBootstrapToken] = useState('')
  const [workspacePath, setWorkspacePath] = useState('')

  useEffect(() => {
    window.clawwork.getSettings().then((settings) => {
      if (!settings) return
      setWorkspacePath(settings.workspacePath || '未配置')
      if (settings.gatewayUrl) setGatewayUrl(settings.gatewayUrl)
      if (settings.bootstrapToken) setBootstrapToken(settings.bootstrapToken)
    })
  }, [])

  const handleThemeToggle = useCallback((next: 'dark' | 'light') => {
    setTheme(next)
    toast.success('Theme updated')
  }, [setTheme])

  const handleSaveConnection = useCallback(() => {
    try {
      new URL(gatewayUrl)
    } catch {
      toast.error('Invalid URL format')
      return
    }
    const updates: Record<string, string> = { gatewayUrl }
    if (bootstrapToken.trim()) {
      updates.bootstrapToken = bootstrapToken.trim()
    }
    window.clawwork.updateSettings(updates).then(() => {
      toast.success('Reconnecting...')
    })
  }, [gatewayUrl, bootstrapToken])

  const sectionLabel = 'text-xs text-[var(--text-tertiary,var(--text-muted))] uppercase tracking-wider mb-3'
  const cardClass = cn(
    'rounded-xl p-5',
    'bg-[var(--bg-elevated)] shadow-[var(--shadow-card)]',
    'border border-[var(--border-subtle)]',
  )
  const inputClass = cn(
    'flex-1 h-10 px-3 py-2 rounded-md',
    'bg-[var(--bg-tertiary)] border border-[var(--border)]',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
    'outline-none ring-accent-focus transition-colors',
  )

  return (
    <motion.div {...motionPresets.fadeIn} className="flex flex-col h-full">
      <header className="flex items-center justify-between h-12 px-4 border-b border-[var(--border)] flex-shrink-0">
        <h2 className="font-medium text-[var(--text-primary)]">设置</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="titlebar-no-drag">
          <X size={16} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Theme */}
        <section>
          <p className={sectionLabel}>外观</p>
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-primary)]">主题</span>
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeToggle(t)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-1.5 text-sm transition-colors',
                      theme === t
                        ? 'bg-[var(--accent)] text-[var(--bg-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                    )}
                  >
                    {t === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                    {t === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Connection */}
        <section>
          <p className={sectionLabel}>连接</p>
          <div className={cn(cardClass, 'space-y-4')}>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">Gateway 地址</label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="ws://127.0.0.1:18789"
                className={cn(inputClass, 'w-full')}
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">Token</label>
              <input
                type="password"
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                placeholder="留空使用默认 Token"
                className={cn(inputClass, 'w-full')}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="soft" onClick={handleSaveConnection} className="titlebar-no-drag">
                保存并重连
              </Button>
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section>
          <p className={sectionLabel}>存储</p>
          <div className={cardClass}>
            <label className="text-sm text-[var(--text-secondary)] mb-2 block">工作空间</label>
            <div className={cn(
              'h-10 px-3 flex items-center rounded-md',
              'bg-[var(--bg-tertiary)] border border-[var(--border)]',
              'text-[var(--text-primary)] text-sm',
            )}>
              {workspacePath}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">AI 产物保存位置（只读）</p>
          </div>
        </section>

        {/* Version */}
        <section>
          <p className={sectionLabel}>关于</p>
          <div className={cardClass}>
            <p className="text-sm text-[var(--text-primary)]">ClawWork v0.1.0</p>
          </div>
        </section>
      </div>
    </motion.div>
  )
}

import {
  ChevronRight,
  Download,
  Globe,
  Info,
  LogOut,
  MonitorCog,
  Sparkles,
  Trash2,
  Vibrate,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { useHistory } from '@/hooks/use-history'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useAuth } from '@/lib/auth'
import { haptic } from '@/lib/haptics'
import { initials } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { usePreferences, type Appearance } from '@/store/preferences'

export function ProfileScreen() {
  const { user, signOut, mode } = useAuth()
  const { analyses, repository } = useHistory()
  const { canInstall, installed, promptInstall } = useInstallPrompt()
  const guideLanguage = usePreferences((state) => state.guideLanguage)
  const setGuideLanguage = usePreferences((state) => state.setGuideLanguage)
  const appearance = usePreferences((state) => state.appearance)
  const setAppearance = usePreferences((state) => state.setAppearance)
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const setHaptics = usePreferences((state) => state.setHaptics)
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const [confirmClear, setConfirmClear] = useState(false)

  const stats = useMemo(() => {
    const cities = new Set(analyses.map((analysis) => analysis.report.location.name))
    const messages = analyses.reduce((total, analysis) => total + analysis.messages.length, 0)
    return { places: analyses.length, cities: cities.size, messages }
  }, [analyses])

  return (
    <section className="h-full overflow-y-auto overscroll-contain bg-background pb-28">
      <header className="px-5 safe-top">
        <div className="pb-5 pt-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Your corner
          </p>
          <h1 className="mt-1.5 font-serif text-[34px] leading-[1.05] tracking-[-0.025em]">
            Settings
          </h1>
        </div>

        <div className="flex items-center gap-4 rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-ambient">
          <Avatar className="size-14">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="font-serif text-lg">
              {initials(user?.name ?? 'N')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[21px] leading-tight tracking-[-0.015em]">
              {user?.name}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">{user?.email}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {mode === 'supabase' ? 'Google account' : 'Demo account'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: 'Places', value: stats.places },
            { label: 'Cities', value: stats.cities },
            { label: 'Messages', value: stats.messages },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-border/60 bg-card/70 px-3 py-3.5 text-center"
            >
              <p className="font-serif text-2xl leading-none">{item.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-5 pt-7">
        <Group title="The guide">
          <Row icon={<Globe className="size-4" />} title="Language" description="Language of the guide">
            <Segmented
              value={guideLanguage}
              onChange={(value) => {
                setGuideLanguage(value)
                haptic('light', hapticsEnabled)
              }}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'tr', label: 'TR' },
              ]}
            />
          </Row>
          <Row icon={<Sparkles className="size-4" />} title="Welcome slides" description="Show the intro again">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const userId = user?.id ?? ''
                usePreferences.setState((state) => ({
                  onboarded: { ...state.onboarded, [userId]: false },
                }))
                toast('The welcome slides will show on next launch')
              }}
            >
              Show again
            </Button>
          </Row>
        </Group>

        <Group title="Appearance & feel">
          <Row
            icon={<MonitorCog className="size-4" />}
            title="Appearance"
            description="Match your device or pick one"
            stacked
          >
            <Segmented
              value={appearance}
              onChange={(value: Appearance) => setAppearance(value)}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
          <Row icon={<Vibrate className="size-4" />} title="Haptics" description="A gentle tap on capture">
            <Switch
              checked={hapticsEnabled}
              onCheckedChange={(value) => {
                setHaptics(value)
                haptic('medium', value)
              }}
            />
          </Row>
        </Group>

        <Group title="App">
          <button
            type="button"
            onClick={async () => {
              if (!canInstall) {
                toast('Use your browser menu → “Add to Home Screen”')
                return
              }
              const accepted = await promptInstall()
              if (accepted) toast.success('Nekibuki was added to your home screen')
            }}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Download className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium">Install Nekibuki</span>
              <span className="block text-[12.5px] text-muted-foreground">
                {installed ? 'Already installed' : canInstall ? 'Add it to your home screen' : 'Available from your browser menu'}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-destructive/5"
          >
            <span className="grid size-9 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-destructive">Clear my places</span>
              <span className="block text-[12.5px] text-muted-foreground">
                Removes every saved guide and conversation
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <LogOut className="size-4" />
            </span>
            <span className="flex-1 text-[15px] font-medium">Sign out</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Group>

        <div className="flex items-center justify-center gap-2 pb-4 pt-2 text-[12px] text-muted-foreground">
          <Info className="size-3.5" />
          Nekibuki v0.1 · made for curious travellers
        </div>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear everything?</DialogTitle>
            <DialogDescription>
              Your saved guides and conversations will be deleted from this device. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Keep them
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await repository?.clear()
                bumpHistory()
                setConfirmClear(false)
                toast.success('All places cleared')
              }}
            >
              <Trash2 className="size-4" /> Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/80 shadow-ambient">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon,
  title,
  description,
  children,
  stacked,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  /** Put the control on its own line — for wide controls like a segmented picker. */
  stacked?: boolean
}) {
  const identity = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">{description}</p>
      </div>
    </>
  )

  if (stacked) {
    return (
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3.5">{identity}</div>
        <div className="mt-3 flex justify-end">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      {identity}
      {children}
    </div>
  )
}

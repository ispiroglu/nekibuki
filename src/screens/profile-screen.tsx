import {
  Camera,
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
  const setScreenIndex = useAppStore((state) => state.setScreenIndex)
  const [confirmClear, setConfirmClear] = useState(false)

  const stats = useMemo(() => {
    const cities = new Set(analyses.map((analysis) => analysis.report.location.name))
    const messages = analyses.reduce((total, analysis) => total + analysis.messages.length, 0)
    return { places: analyses.length, cities: cities.size, messages }
  }, [analyses])

  return (
    <section className="h-full overflow-y-auto overscroll-contain bg-background pb-28">
      <div className="mx-auto w-full max-w-2xl px-5 safe-top">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setScreenIndex(1)}
            aria-label="Open the camera"
            className="grid size-11 place-items-center rounded-full bg-secondary text-foreground active:scale-[0.97]"
          >
            <Camera className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Avatar className="size-16">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-2xl">{initials(user?.name ?? 'N')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-3xl font-medium">{user?.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              {mode === 'supabase' ? 'Google account' : 'Demo account'}
            </span>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-2">
          {[
            { label: 'Places', value: stats.places },
            { label: 'Cities', value: stats.cities },
            { label: 'Messages', value: stats.messages },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-secondary px-4 py-3">
              <dd className="font-serif text-3xl tabular-nums">{item.value}</dd>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
            </div>
          ))}
        </dl>

        <Group title="The guide">
          <Row icon={<Globe />} title="Language" description="Language of the guide">
            <Segmented
              className="shrink-0"
              label="Guide language"
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
          <Row icon={<Sparkles />} title="Welcome slides" description="Show the intro again">
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
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
            icon={<MonitorCog />}
            title="Appearance"
            description="Match your device or pick one"
            stacked
          >
            <Segmented
              label="Appearance"
              value={appearance}
              onChange={(value: Appearance) => setAppearance(value)}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
          <Row icon={<Vibrate />} title="Haptics" description="A gentle tap on capture">
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
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left active:bg-accent/60"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80 [&_svg]:size-4">
              <Download />
            </span>
            <span className="min-w-0 flex-1 py-3">
              <span className="block truncate text-[15px] font-medium">Install Nekibuki</span>
              <span className="block truncate text-xs text-muted-foreground">
                {installed
                  ? 'Already installed'
                  : canInstall
                    ? 'Add it to your home screen'
                    : 'Available from your browser menu'}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </Group>

        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="mt-8 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-[0_0_0_1px_var(--border)] active:bg-accent/60"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-destructive [&_svg]:size-4">
            <Trash2 />
          </span>
          <span className="min-w-0 flex-1 py-3">
            <span className="block truncate text-[15px] font-medium text-destructive">
              Clear my places
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Removes every saved guide and conversation
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card font-medium text-destructive shadow-[0_0_0_1px_var(--border)] active:scale-[0.99]"
        >
          <LogOut className="size-4" /> Sign out
        </button>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Info className="size-3.5" />
          Nekibuki v0.1 · made for curious travellers
        </p>
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
    <section className="mt-8">
      <h2 className="label-caps px-4 text-muted-foreground">{title}</h2>
      <div className="mt-2 divide-y overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--border)]">
        {children}
      </div>
    </section>
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
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1 py-3">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
    </>
  )

  if (stacked) {
    return (
      <div className="px-4 text-left">
        <div className="flex items-center gap-3">{identity}</div>
        <div className="flex justify-end pb-3">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
      {identity}
      {children}
    </div>
  )
}

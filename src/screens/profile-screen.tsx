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
import { useT } from '@/lib/ui-language'

export function ProfileScreen({ active }: { active?: boolean }) {
  const { user, signOut, mode } = useAuth()
  const t = useT()
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
  // The deck keeps every panel mounted, so the panel that owns the route must
  // be the only `h1` on it. The shell may pass `active`; the store is the
  // fallback so the page never carries two headings of the same level.
  const panelActive = useAppStore((state) => state.screenIndex === 0)
  const isActive = active ?? panelActive
  const [confirmClear, setConfirmClear] = useState(false)

  const stats = useMemo(() => {
    const cities = new Set(analyses.map((analysis) => analysis.report.location.name))
    const messages = analyses.reduce((total, analysis) => total + analysis.messages.length, 0)
    return { places: analyses.length, cities: cities.size, messages }
  }, [analyses])

  const Heading = isActive ? 'h1' : 'h2'

  return (
    <section className="h-full touch-pan-y overflow-y-auto overscroll-contain bg-background pb-28">
      <div className="mx-auto w-full max-w-2xl px-5 safe-top">
        <div className="flex flex-col [@media(max-height:480px)]:flex-row [@media(max-height:480px)]:items-center [@media(max-height:480px)]:gap-3">
          <div className="flex justify-end [@media(max-height:480px)]:contents">
            <button
              type="button"
              onClick={() => setScreenIndex(1)}
              aria-label={t('Open the camera', 'Kamerayı aç')}
              className="grid size-11 shrink-0 place-items-center self-end rounded-full bg-secondary text-foreground active:scale-[0.97] [@media(max-height:480px)]:self-auto"
            >
              <Camera className="size-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 [@media(max-height:480px)]:mt-0 [@media(max-height:480px)]:min-w-0 [@media(max-height:480px)]:flex-1">
            <Avatar className="size-16 [@media(max-height:480px)]:size-12">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="text-2xl">{initials(user?.name ?? 'N')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Heading className="display truncate text-3xl font-medium [@media(max-height:480px)]:text-2xl">
                {user?.name}
              </Heading>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {mode === 'google' ? t('Google account', 'Google hesabı') : t('Demo account', 'Demo hesap')}
              </span>
            </div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-2">
          {[
            { label: t('Places', 'Yerler'), value: stats.places },
            { label: t('Cities', 'Şehirler'), value: stats.cities },
            { label: t('Messages', 'Mesajlar'), value: stats.messages },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-secondary px-4 py-3">
              <dd className="font-serif text-3xl tabular-nums">{item.value}</dd>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
            </div>
          ))}
        </dl>

        <Group title={t('The guide', 'Rehber')}>
          <Row icon={<Globe />} title={t('Language', 'Dil')} description={t('App and guide language', 'Uygulama ve rehber dili')}>
            <Segmented
              className="shrink-0"
              label={t('Guide language', 'Rehber dili')}
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
          <Row icon={<Sparkles />} title={t('Intro slides', 'Tanıtım slaytları')} description={t('Show it again', 'Tekrar göster')}>
            <Button
              variant="secondary"
              size="sm"
              className="h-11 shrink-0"
              onClick={() => {
                const userId = user?.id ?? ''
                usePreferences.setState((state) => ({
                  onboarded: { ...state.onboarded, [userId]: false },
                }))
                toast(t('The welcome slides will show on next launch', 'Karşılama slaytları bir sonraki açılışta gösterilecek'))
              }}
            >
              {t('Show again', 'Tekrar göster')}
            </Button>
          </Row>
        </Group>

        <Group title={t('Appearance & feel', 'Görünüm ve his')}>
          <Row
            icon={<MonitorCog />}
            title={t('Appearance', 'Görünüm')}
            description={t('Match your device or pick one', 'Cihazınla eşleştir ya da seç')}
            stacked
          >
            <Segmented
              label={t('Appearance', 'Görünüm')}
              value={appearance}
              onChange={(value: Appearance) => setAppearance(value)}
              options={[
                { value: 'system', label: t('Auto', 'Otomatik') },
                { value: 'light', label: t('Light', 'Açık') },
                { value: 'dark', label: t('Dark', 'Koyu') },
              ]}
            />
          </Row>
          <Row
            icon={<Vibrate />}
            title={t('Haptics', 'Titreşim')}
            titleId="profile-haptics-label"
            description={t('A gentle tap on capture', 'Çekimde hafif bir dokunuş')}
          >
            <Switch
              aria-labelledby="profile-haptics-label"
              checked={hapticsEnabled}
              onCheckedChange={(value) => {
                setHaptics(value)
                haptic('medium', value)
              }}
            />
          </Row>
        </Group>

        <Group title={t('App', 'Uygulama')}>
          <button
            type="button"
            onClick={async () => {
              if (!canInstall) {
                toast(t('Use your browser menu → “Add to Home Screen”', 'Tarayıcı menüsünden → “Ana Ekrana Ekle”yi kullan'))
                return
              }
              const accepted = await promptInstall()
              if (accepted) toast.success(t('Nekibuki was added to your home screen', 'Nekibuki ana ekranına eklendi'))
            }}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left active:bg-accent/60"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80 [&_svg]:size-4">
              <Download />
            </span>
            <span className="min-w-0 flex-1 py-3">
              <span className="block truncate text-[15px] font-medium">{t('Install Nekibuki', 'Nekibuki\'yi yükle')}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {installed
                  ? t('Already installed', 'Zaten yüklü')
                  : canInstall
                    ? t('Add it to your home screen', 'Ana ekranına ekle')
                    : t('From your browser menu', 'Tarayıcı menüsünden')}
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
              {t('Clear my places', 'Yerlerimi temizle')}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t('Removes every saved guide', 'Kaydedilen tüm rehberleri kaldırır')}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card font-medium text-foreground shadow-[0_0_0_1px_var(--border)] active:scale-[0.99]"
        >
          <LogOut className="size-4" /> {t('Sign out', 'Çıkış yap')}
        </button>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Info className="size-3.5" />
          {t('Nekibuki v0.1 · made for curious travellers', 'Nekibuki v0.1 · meraklı gezginler için')}
        </p>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Clear everything?', 'Her şey temizlensin mi?')}</DialogTitle>
            <DialogDescription>
              {t('Your saved guides and conversations will be deleted from this device. This cannot be undone.', 'Kaydedilen rehberlerin ve sohbetlerin bu cihazdan silinecek. Bu işlem geri alınamaz.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t('Keep them', 'Kalsın')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await repository?.clear()
                bumpHistory()
                setConfirmClear(false)
                toast.success(t('All places cleared', 'Tüm yerler temizlendi'))
              }}
            >
              <Trash2 className="size-4" /> {t('Clear', 'Temizle')}
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
  titleId,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  /** Put the control on its own line — for wide controls like a segmented picker. */
  stacked?: boolean
  /** Id of the visible title, so a control can take it as its accessible name. */
  titleId?: string
}) {
  const identity = (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1 py-3">
        <p id={titleId} className="truncate text-[15px] font-medium">
          {title}
        </p>
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

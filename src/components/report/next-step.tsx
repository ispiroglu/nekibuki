import type { NextStep } from '@shared/types'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/ui-language'
import { cn } from '@/lib/utils'

interface NextStepsProps {
  steps?: NextStep[]
  /** The place the traveller is standing in, e.g. "Colosseum". */
  placeTitle: string
  /** Where that place is, e.g. "Rome". */
  placeName: string
  onShoot: (step: NextStep) => void
}

/**
 * The guide's route: what to photograph next, and why that shot is worth
 * taking.
 *
 * It is a walk, not a menu, so the steps are strung on a hairline route with
 * a mark at each waypoint. Every step carries exactly one action — the shot
 * itself — and the prose around it is the guide talking, not a label on a
 * button.
 */
export function NextSteps({ steps, placeTitle, placeName, onShoot }: NextStepsProps) {
  const t = useT()
  // Guides saved before this field existed have no route, and an empty route
  // section would be a promise the guide cannot keep.
  if (!steps || steps.length === 0) return null

  return (
    <section>
      <h2 className="text-title font-medium tracking-[-0.01em]">{t('Where to point the camera', 'Kamerayı nereye tutmalısın')}</h2>
      <p className="mt-3 max-w-[32rem] text-body leading-relaxed text-muted-foreground [text-wrap:pretty]">
        {t(
          `Pick one and the camera opens with that shot written in — you are still in ${placeName}.`,
          `Birini seç; kamera o kareyle açılsın — hâlâ ${placeName} içindesin.`,
        )}
      </p>

      <ol className="mt-6" aria-label={t(`Shots to take at ${placeTitle}`, `${placeTitle} için çekilecek kareler`)}>
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <li key={step.id} className={cn('relative pl-8', !last && 'pb-8')}>
              {/*
                The route: a hairline down to the next waypoint. The mark sits
                on the line, so the steps read as one walk rather than as a
                list that happens to be vertical.
              */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute bottom-[-12px] left-[11.5px] top-[12px] w-px bg-border"
                />
              )}
              <span
                aria-hidden
                className="absolute left-2 top-[0.5rem] size-2 rounded-full bg-brand"
              />

              <p className="label-caps text-muted-foreground">{step.label}</p>
              <h3 className="mt-1.5 font-serif text-headline font-medium leading-snug break-words">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[32rem] font-serif text-reading leading-[1.7] text-foreground/85 [text-wrap:pretty]">
                {step.instruction}
              </p>
              <p className="mt-1.5 max-w-[32rem] font-serif text-reading leading-[1.7] text-muted-foreground [text-wrap:pretty]">
                {step.why}
              </p>

              <Button
                variant="outline"
                className="mt-4 motion-reduce:active:scale-100"
                // The name says what will happen and which shot it is; the
                // visible label is still inside it, so a screen reader and a
                // sighted user hear the same words.
                aria-label={t(`Shoot this: ${step.title}`, `Bunu çek: ${step.title}`)}
                onClick={() => onShoot(step)}
              >
                <Camera className="size-4" aria-hidden />
                {t('Shoot this', 'Bunu çek')}
              </Button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

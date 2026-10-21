import type { Oddity } from '@shared/types'

/**
 * The strange-but-true notes.
 *
 * These are deliberately not cards. The trivia row is a horizontal line of
 * bordered surfaces, and a second row of surfaces would give the report one
 * rhythm where it needs two. So the notes are set the way a margin note sits
 * in a printed guide: hairline rules, a hanging mark in the margin, and the
 * serif carrying the voice. No fill, no ring, no shadow — nothing that could
 * be mistaken for the trivia cards above them.
 */
export function OddityCards({ oddities }: { oddities?: Oddity[] }) {
  // A guide written before this field existed has no oddities at all, and the
  // section has to disappear rather than leave a heading with nothing under it.
  if (!oddities || oddities.length === 0) return null

  return (
    <section>
      <h2 className="text-title font-medium tracking-[-0.01em]">Odd but true</h2>
      <p className="mt-3 max-w-[32rem] text-body leading-relaxed text-muted-foreground [text-wrap:pretty]">
        What a local would tell you if you asked.
      </p>

      {/*
        The notes are off the screen for most of the read, so they are laid
        out and painted only when the reader reaches them.
      */}
      <ul className="mt-6 lazy-paint" style={{ containIntrinsicSize: 'auto 380px' }}>
        {oddities.map((oddity) => (
          <li
            key={oddity.id}
            className="border-b border-border pt-[1.25rem] pb-[1.25rem]"
          >
            {/*
              The mark hangs in the margin and the body hangs under the
              title, so a note reads as one block of writing with a mark
              beside it rather than as a list item.
            */}
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2">
              <span
                aria-hidden
                className="mt-[1rem] h-px w-4 self-start bg-muted-foreground/50"
              />
              <div className="min-w-0">
                <h3 className="font-serif text-headline font-medium leading-snug break-words">
                  {oddity.title}
                </h3>
                <p className="mt-2 max-w-[32rem] font-serif text-reading leading-[1.7] text-muted-foreground [text-wrap:pretty]">
                  {oddity.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

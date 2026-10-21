import { Link } from 'react-router-dom'

export type LegalPage = 'terms' | 'privacy'

interface LegalSection {
  title: string
  paragraphs: string[]
}

interface LegalDocument {
  title: string
  intro: string
  sections: LegalSection[]
}

/**
 * These pages describe what the build actually does. Nothing here promises a
 * company, a jurisdiction, a retention period or a contact address that the
 * project cannot honour.
 */
const TERMS: LegalDocument = {
  title: 'Terms',
  intro: 'What using Nekibuki v0.1 means, in plain words.',
  sections: [
    {
      title: 'What Nekibuki is',
      paragraphs: [
        'Nekibuki turns a photograph into a short guide. You point the camera at a place, the app asks a vision model to look at the picture, and the model writes what it sees: what the place is, a few things worth knowing, and details that point at what is visible in the frame.',
        'The guide is generated for you. It is not written by a person, and it is not taken from a place database.',
      ],
    },
    {
      title: 'What you agree to',
      paragraphs: [
        'Use Nekibuki lawfully, and keep your sign-in to yourself. The app asks for the camera only when you want to take a picture, and for location only if you allow it; it works without location.',
        'You keep the rights to the photos you take. Nekibuki does not claim them, and the guide written from your photo is generated for your own use.',
      ],
    },
    {
      title: 'The guide can be wrong',
      paragraphs: [
        'A model reads what it can see in a photograph, so it can misname a building, misdate a façade or describe a detail that is not there.',
        'Check anything you would act on — opening hours, prices, entry rules, directions — somewhere else first. Nekibuki is a companion to a visit, not a record of fact.',
      ],
    },
    {
      title: 'Your account',
      paragraphs: [
        'Sign-in is with Google, through Supabase, on a deployment configured for it. In demo mode the app keeps a placeholder traveller profile in your browser and contacts no Google account at all.',
        'Signing out forgets that profile on this device.',
      ],
    },
    {
      title: 'Availability',
      paragraphs: [
        'This is version 0.1, a pre-release build. Writing a guide needs a connection; guides, photos and conversations you already have stay readable offline.',
        'Features may change between builds, and this page describes the build you are using.',
      ],
    },
    {
      title: 'No legal framework yet',
      paragraphs: [
        'There is no company behind this build yet, so these terms name no jurisdiction, no liability limit and no arbitration process. They describe how the app behaves; they are not a contract.',
        'When there is a legal entity, this page will say so and point at the terms that apply.',
      ],
    },
  ],
}

const PRIVACY: LegalDocument = {
  title: 'Privacy Policy',
  intro: 'What stays on your device, and what has to leave it.',
  sections: [
    {
      title: 'What stays on your device',
      paragraphs: [
        'By default everything the app saves stays in your browser: the guides you create, the photos you took and the conversations you had are kept in IndexedDB, the local database of this browser, on this device.',
        'Nothing is uploaded to keep them. You can delete a single guide from its own page, or clear all of your places from the profile; both remove the local copy.',
      ],
    },
    {
      title: 'What leaves your device',
      paragraphs: [
        'To write a guide, the app sends the photo you took to its own API, which forwards a compressed copy of it to the vision provider the deployment is configured with — Gemini 2.5 Flash in the hosted build. The provider reads the picture and returns text; Nekibuki does not keep a copy of the photo it sent.',
        'The coordinates the device holds are sent along with the photo only if you allowed location access.',
        'When you ask a follow-up question in the conversation, the guide text and your question are sent to the same API and the same provider.',
      ],
    },
    {
      title: 'Optional Supabase',
      paragraphs: [
        'A deployment can be configured with Supabase. Then sign-in runs through Supabase’s Google OAuth, and guides and photos are stored in Supabase storage under your account instead of in the browser.',
        'If Supabase is not configured, the app runs in demo mode: no Google account is contacted and nothing is stored on a server.',
      ],
    },
    {
      title: 'No trackers',
      paragraphs: [
        'This build contains no analytics, advertising or crash-reporting trackers.',
        'The only device permissions it asks for are the camera, the photo library when you pick a picture yourself, and location if you want it.',
      ],
    },
    {
      title: 'Interface and guide language',
      paragraphs: [
        'The interface is in English. The guide — the generated text about the place — can be English or Turkish, and you choose in the profile.',
        'Choosing Turkish changes the guide, not the buttons.',
      ],
    },
    {
      title: 'Removing what is stored',
      paragraphs: [
        'Delete a guide from its page or clear your places in the profile to remove it from this device; sign out to forget the traveller profile. Clearing the browser’s site data for Nekibuki removes the local database entirely.',
        'On a deployment that stores guides in Supabase, the same actions remove them there as well.',
      ],
    },
  ],
}

const DOCUMENTS: Record<LegalPage, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
}

const LINK =
  'rounded-sm text-brand-ink underline decoration-brand-ink/40 underline-offset-4 transition-colors hover:decoration-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink'

export function LegalScreen({ page }: { page: LegalPage }) {
  const document = DOCUMENTS[page]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto w-full max-w-[42rem] flex-1 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16 sm:px-8">
        <p className="display text-lg text-brand-ink">Nekibuki</p>
        <h1 className="display mt-3 text-4xl font-medium">{document.title}</h1>
        <p className="mt-3 text-base text-muted-foreground">{document.intro}</p>

        <div className="mt-10 space-y-9">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-medium tracking-[-0.01em]">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="font-serif text-[1.0625rem] leading-[1.7] text-foreground/80"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[42rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-6 text-sm sm:px-8">
          <Link to="/" className={LINK}>
            Back to Nekibuki
          </Link>
          <nav aria-label="Legal pages" className="flex items-center gap-5">
            <Link to="/terms" className={LINK}>
              Terms
            </Link>
            <Link to="/privacy" className={LINK}>
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

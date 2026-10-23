import type { GuideLanguage } from '@shared/types'
import { Link } from 'react-router-dom'
import { useUiLanguage } from '@/lib/ui-language'

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
const TERMS: Record<GuideLanguage, LegalDocument> = {
  en: {
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
          'On the hosted build, sign-in is with Google through Better Auth, running on the same Cloudflare Worker that serves the app. In demo mode the app keeps a placeholder traveller profile in your browser and contacts no Google account at all.',
          'Signing out ends the session and forgets the traveller profile on this device.',
        ],
      },
      {
        title: 'Availability',
        paragraphs: [
          'This is version 0.1, a pre-release build. Writing a guide needs a connection. In demo mode the guides, photos and conversations you already have stay on this device and remain readable without one.',
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
  },
  tr: {
    title: 'Koşullar',
    intro: 'Nekibuki v0.1 kullanmanın ne anlama geldiği, sade bir dille.',
    sections: [
      {
        title: 'Nekibuki nedir',
        paragraphs: [
          'Nekibuki bir fotoğrafı kısa bir rehbere dönüştürür. Kamerayı bir yere tutarsın, uygulama bir görsel modele fotoğrafa bakmasını söyler ve model gördüğünü yazar: yerin ne olduğunu, bilmeye değer birkaç şeyi ve karede görünen ayrıntıları.',
          'Rehber senin için oluşturulur. Bir kişi tarafından yazılmaz ve bir yer veritabanından alınmaz.',
        ],
      },
      {
        title: 'Neyi kabul ediyorsun',
        paragraphs: [
          'Nekibuki’yi hukuka uygun kullan ve giriş bilgilerini kendine sakla. Uygulama kamerayı yalnızca fotoğraf çekmek istediğinde, konumu ise yalnızca izin verirsen ister; konum olmadan da çalışır.',
          'Çektiğin fotoğrafların hakları sende kalır. Nekibuki bunları talep etmez ve fotoğrafından yazılan rehber senin kullanımın için oluşturulur.',
        ],
      },
      {
        title: 'Rehber yanılabilir',
        paragraphs: [
          'Bir model fotoğrafta görebildiğini okur; bu yüzden bir binayı yanlış adlandırabilir, bir cepheyi yanlış tarihlendirebilir veya orada olmayan bir ayrıntıyı anlatabilir.',
          'Harekete geçeceğin her şeyi — açılış saatleri, fiyatlar, giriş kuralları, yol tarifleri — önce başka bir yerden kontrol et. Nekibuki bir ziyaretin yoldaşıdır, olguların kaydı değildir.',
        ],
      },
      {
        title: 'Hesabın',
        paragraphs: [
          'Barındırılan sürümde giriş, uygulamayı sunan aynı Cloudflare Worker üzerinde çalışan Better Auth aracılığıyla Google ile yapılır. Demo modunda uygulama tarayıcında yer tutucu bir gezgin profili tutar ve hiçbir Google hesabıyla iletişim kurmaz.',
          'Çıkış yapmak oturumu sonlandırır ve bu cihazdaki gezgin profilini unutur.',
        ],
      },
      {
        title: 'Kullanılabilirlik',
        paragraphs: [
          'Bu, 0.1 sürümü, yayın öncesi bir yapıdır. Rehber yazmak için bağlantı gerekir. Demo modunda hâlihazırda sahip olduğun rehberler, fotoğraflar ve sohbetler bu cihazda kalır ve bağlantı olmadan okunabilir.',
          'Özellikler yapılar arasında değişebilir; bu sayfa kullandığın yapıyı anlatır.',
        ],
      },
      {
        title: 'Henüz yasal bir çerçeve yok',
        paragraphs: [
          'Bu yapının arkasında henüz bir şirket yok; bu yüzden bu koşullar bir yargı bölgesi, sorumluluk sınırı veya tahkim süreci belirtmez. Uygulamanın nasıl davrandığını anlatırlar; bir sözleşme değildirler.',
          'Bir tüzel kişilik olduğunda bu sayfa bunu belirtecek ve geçerli koşullara işaret edecektir.',
        ],
      },
    ],
  },
}

const PRIVACY: Record<GuideLanguage, LegalDocument> = {
  en: {
    title: 'Privacy Policy',
    intro: 'What stays on your device, and what has to leave it.',
    sections: [
      {
        title: 'What stays on your device',
        paragraphs: [
          'In demo mode everything the app saves stays in your browser: the guides you create, the photos you took and the conversations you had are kept in IndexedDB, the local database of this browser, on this device.',
          'You can delete a single guide from its own page, or clear all of your places from the profile; both remove the local copy.',
        ],
      },
      {
        title: 'What leaves your device',
        paragraphs: [
          'To write a guide, the app sends the photo you took to its own API on Cloudflare. The API sends a compressed copy of it to the vision provider the deployment is configured with — Gemini 3.1 Flash-Lite in the hosted build. The provider reads the picture and returns text.',
          'The coordinates the device holds are sent along with the photo only if you allowed location access.',
          'When you ask a follow-up question, the API reads the archived photo, the guide text and the conversation, and sends them to the same provider with your question. The photo is what lets the guide answer about a detail it can see.',
        ],
      },
      {
        title: 'When you sign in',
        paragraphs: [
          'The hosted build stores your guides and conversations in Cloudflare D1, a SQLite database, and the photos in a private Cloudflare R2 bucket. Both are tied to your Google account id.',
          'Photos are never given a public URL. The app serves them through an authenticated route that checks the signed-in owner first, so another traveller cannot open your guides or photos.',
          'If the deployment is not configured for Google sign-in, the app runs in demo mode: no Google account is contacted and nothing is stored on a server.',
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
          'The interface and the guide follow the language you pick in the profile. Choosing Turkish changes the buttons, the headings and the generated text about the place.',
        ],
      },
      {
        title: 'Removing what is stored',
        paragraphs: [
          'Delete a guide from its page or clear your places in the profile. When you are signed in, that removes the database row and the archived photos from Cloudflare; in demo mode it removes the copy in this browser.',
          'Signing out ends the session. Clearing the browser’s site data for Nekibuki removes the local demo database entirely.',
        ],
      },
    ],
  },
  tr: {
    title: 'Gizlilik Politikası',
    intro: 'Neyin cihazında kaldığı ve neyin cihazdan çıkması gerektiği.',
    sections: [
      {
        title: 'Cihazında kalanlar',
        paragraphs: [
          'Demo modunda uygulamanın kaydettiği her şey tarayıcında kalır: oluşturduğun rehberler, çektiğin fotoğraflar ve yaptığın sohbetler bu cihazdaki tarayıcının yerel veritabanı olan IndexedDB’de tutulur.',
          'Tek bir rehberi kendi sayfasından silebilir ya da profilden tüm yerlerini temizleyebilirsin; ikisi de yerel kopyayı kaldırır.',
        ],
      },
      {
        title: 'Cihazından çıkanlar',
        paragraphs: [
          'Rehber yazmak için uygulama çektiğin fotoğrafı Cloudflare üzerindeki kendi API’sine gönderir. API, fotoğrafın sıkıştırılmış bir kopyasını yapılandırılmış görsel sağlayıcısına gönderir — barındırılan sürümde Gemini 3.1 Flash-Lite. Sağlayıcı fotoğrafı okur ve metin döndürür.',
          'Cihazın tuttuğu koordinatlar fotoğrafla birlikte yalnızca konum erişimine izin verdiysen gönderilir.',
          'Takip sorusu sorduğunda API arşivlenmiş fotoğrafı, rehber metnini ve sohbeti okur ve sorunla birlikte aynı sağlayıcıya gönderir. Rehberin görebildiği bir ayrıntı hakkında cevap verebilmesini sağlayan şey fotoğraftır.',
        ],
      },
      {
        title: 'Giriş yaptığında',
        paragraphs: [
          'Barındırılan sürüm rehberlerini ve sohbetlerini Cloudflare D1’de, bir SQLite veritabanında; fotoğrafları ise özel bir Cloudflare R2 kovasında saklar. İkisi de Google hesap kimliğine bağlıdır.',
          'Fotoğraflara hiçbir zaman herkese açık bir URL verilmez. Uygulama onları önce oturum açmış sahibi kontrol eden kimlik doğrulamalı bir rotadan sunar; böylece başka bir gezgin rehberlerini veya fotoğraflarını açamaz.',
          'Dağıtım Google girişi için yapılandırılmamışsa uygulama demo modunda çalışır: hiçbir Google hesabıyla iletişim kurulmaz ve sunucuda hiçbir şey saklanmaz.',
        ],
      },
      {
        title: 'İzleyici yok',
        paragraphs: [
          'Bu yapıda analitik, reklam veya çökme raporlama izleyicisi yoktur.',
          'İstediği tek cihaz izinleri kamera, kendin bir fotoğraf seçtiğinde fotoğraf kitaplığı ve istersen konumdur.',
        ],
      },
      {
        title: 'Arayüz ve rehber dili',
        paragraphs: [
          'Arayüz ve rehber, profilde seçtiğin dili izler. Türkçeyi seçmek düğmeleri, başlıkları ve yer hakkında oluşturulan metni değiştirir.',
        ],
      },
      {
        title: 'Saklananları kaldırma',
        paragraphs: [
          'Bir rehberi sayfasından sil ya da profilden yerlerini temizle. Oturum açmışken bu, veritabanı satırını ve arşivlenmiş fotoğrafları Cloudflare’den kaldırır; demo modunda bu tarayıcıdaki kopyayı kaldırır.',
          'Çıkış yapmak oturumu sonlandırır. Nekibuki için tarayıcının site verilerini temizlemek yerel demo veritabanını tamamen kaldırır.',
        ],
      },
    ],
  },
}

const DOCUMENTS: Record<LegalPage, Record<GuideLanguage, LegalDocument>> = {
  terms: TERMS,
  privacy: PRIVACY,
}

const LINK =
  'rounded-sm text-brand-ink underline decoration-brand-ink/40 underline-offset-4 transition-colors hover:decoration-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink'

export function LegalScreen({ page }: { page: LegalPage }) {
  const language = useUiLanguage()
  const document = DOCUMENTS[page][language]
  const t = (english: string, turkish: string) => (language === 'tr' ? turkish : english)

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
            {t('Back to Nekibuki', 'Nekibuki’ye dön')}
          </Link>
          <nav aria-label={t('Legal pages', 'Yasal sayfalar')} className="flex items-center gap-5">
            <Link to="/terms" className={LINK}>
              {t('Terms', 'Koşullar')}
            </Link>
            <Link to="/privacy" className={LINK}>
              {t('Privacy Policy', 'Gizlilik Politikası')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

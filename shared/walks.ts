import type { GeoPoint, GuideLanguage } from './types'

/**
 * A guided walk is a fixed sequence of stops. The route belongs in data, not
 * in the model: the agent may notice that the traveller skipped ahead, but it
 * must never invent an order of its own.
 *
 * `brief` is seed material for the narrator, not text shown verbatim. The
 * model still has to ground the story in the current photo and in what the
 * traveller says.
 */
export interface WalkStop {
  id: string
  order: number
  title: string
  titleEn: string
  /** Names a traveller might type: room labels, short forms, common typos. */
  aliases: string[]
  /** What this stop is, in one line. */
  brief: string
  /** The details worth pointing at from here. */
  lookFor: string[]
  /** How to reach this stop from the previous one. */
  arriveBy: string
  /** Not every room is always open; the guide should say so rather than guess. */
  optional?: boolean
  /**
   * Coordinates come from OpenStreetMap for generated tours. The model never
   * supplies a position: it only picks an OSM candidate by id.
   */
  latitude?: number
  longitude?: number
  /** OpenStreetMap element id, e.g. `node/123456`. */
  osmId?: string
}

export interface WalkPlan {
  id: string
  title: string
  titleEn: string
  place: string
  placeEn: string
  country: string
  /** Rough walking time, minutes. */
  minutes: number
  stops: WalkStop[]
  /** A generated tour is written for one photo; a curated one ships in code. */
  source?: 'curated' | 'generated'
  /** The analysis report that seeded a generated tour. */
  analysisId?: string
  /** Where the walk starts: the position of the seeding photo. */
  origin?: GeoPoint
  /** One-paragraph introduction written by the planner. */
  intro?: string
  createdAt?: number
}

export interface WalkPlanSummary {
  id: string
  title: string
  titleEn: string
  place: string
  country: string
  minutes: number
  stopCount: number
  source?: 'curated' | 'generated'
  analysisId?: string
  origin?: GeoPoint
}

/** A walk owned by an account, as listed in Places and on a report. */
export interface WalkRecord {
  id: string
  title: string
  titleEn?: string
  place: string
  language: GuideLanguage
  stopCount: number
  visitedCount: number
  currentStop: string | null
  complete: boolean
  status: 'active' | 'complete'
  source: 'curated' | 'generated'
  analysisId?: string
  createdAt: number
  updatedAt: number
}

export interface WalkStopView {
  id: string
  order: number
  title: string
  brief: string
  lookFor: string[]
  arriveBy: string
  optional?: boolean
}

export interface WalkSnapshot {
  id: string
  plan: WalkPlanSummary
  language: GuideLanguage
  current: WalkStopView | null
  visited: string[]
  remaining: number
  complete: boolean
  messages: { role: 'user' | 'assistant'; content: string; photo?: boolean }[]
}

export interface WalkMessageResult {
  answer: string
  snapshot: WalkSnapshot
}

export function planSummary(plan: WalkPlan): WalkPlanSummary {
  return {
    id: plan.id,
    title: plan.title,
    titleEn: plan.titleEn,
    place: plan.place,
    country: plan.country,
    minutes: plan.minutes,
    stopCount: plan.stops.length,
    source: plan.source,
    analysisId: plan.analysisId,
    origin: plan.origin,
  }
}

export function stopView(stop: WalkStop, language: GuideLanguage): WalkStopView {
  return {
    id: stop.id,
    order: stop.order,
    title: language === 'tr' ? stop.title : stop.titleEn,
    brief: stop.brief,
    lookFor: stop.lookFor,
    arriveBy: stop.arriveBy,
    optional: stop.optional,
  }
}

/**
 * The first walk. More plans can be added without touching the agent: the
 * store only keeps a plan id, and the prompt is built from whatever plan it
 * resolves to.
 */
export const WALK_PLANS: WalkPlan[] = [
  {
    id: 'dolmabahce',
    title: 'Dolmabahçe: Selamlık’tan Harem’e',
    titleEn: 'Dolmabahçe: From Selamlık to the Harem',
    place: 'Dolmabahçe Sarayı',
    placeEn: 'Dolmabahçe Palace',
    country: 'Türkiye',
    minutes: 90,
    stops: [
      {
        id: 'fiskiye',
        order: 1,
        title: 'Fıskiye Önü ve Selamlık Cephesi',
        titleEn: 'The Fountain and the Selamlık Facade',
        aliases: ['fıskiye', 'fiskiye', 'bahçe', 'avlu', 'giriş', 'giris', 'cephe'],
        brief:
          'Dolmabahçe’nin neden klasik Osmanlı sarayı değil de Avrupa sarayı gibi göründüğü; 19. yüzyıl modernleşmesi ve denizle kurulan ilişki.',
        lookFor: [
          'Cephenin simetrisi ve taş süslemeleri',
          'Sarayın Boğaz’a bakan deniz cephesi',
          'Bahçeden salona geçişin törensel düzeni',
        ],
        arriveBy: 'Fıskiye meydanından sarayın ana cephesine doğru yürüyün.',
      },
      {
        id: 'selamlik',
        order: 2,
        title: 'Selamlık / Kabul Salonu',
        titleEn: 'Selamlık / Reception Hall',
        aliases: ['selamlık', 'selamlik', 'kabul salonu', 'kabul', 'süfera', 'sufera'],
        brief:
          'Yabancı elçilerin ve devlet erkânının kabul edildiği resmî dünya. İhtişamın bir protokol dili olduğu.',
        lookFor: [
          'Hereke halının deseni ve ölçeği',
          'Kristal avizenin tavana göre konumu',
          'Oturma düzeninin kimin nereye oturacağını belirlemesi',
        ],
        arriveBy: 'Fıskiyeden ana kapıya yönelin; Selamlık girişindeki görevlileri izleyin.',
      },
      {
        id: 'kristal-merdiven',
        order: 3,
        title: 'Kristal Merdiven',
        titleEn: 'The Crystal Staircase',
        aliases: ['kristal merdiven', 'merdiven', 'kristal', 'cam merdiven'],
        brief:
          'Sarayın en teatral geçişi. Merdivenin sadece ulaşım değil, yukarı çıkanın statüsünü gösteren bir sahne olması.',
        lookFor: [
          'Kristal tırabzanın ışıkla ilişkisi',
          'İki kollu merdivenin simetrisi',
          'Tavan aydınlatmasının merdiveni nasıl sahnelediği',
        ],
        arriveBy: 'Selamlık’tan çıkıp kristal merdivenin bulunduğu ana holü izleyin.',
      },
      {
        id: 'mabeyn',
        order: 4,
        title: 'Mabeyn / Hünkâr Dairesi',
        titleEn: 'Mabeyn / The Sultan’s Private Rooms',
        aliases: ['mabeyn', 'hünkar', 'hunkar', 'hünkâr dairesi', 'çalışma odası', 'calisma odasi'],
        brief:
          'Sarayın resmî yüzünden kişisel yüzüne geçiş. Sultanın günlük çalışma ve dinlenme düzeni.',
        lookFor: [
          'Çalışma masasının pencereye göre konumu',
          'Oturma gruplarının mahremiyet düzeni',
          'Boğaz manzarasının odanın içine girişi',
        ],
        arriveBy: 'Kristal merdivenden üst kata çıkın; Mabeyn yönündeki tabelayı izleyin.',
      },
      {
        id: 'muzik-odasi',
        order: 5,
        title: 'Müzik Odası',
        titleEn: 'The Music Room',
        aliases: ['müzik odası', 'muzik odasi', 'müzik', 'piyano odası', 'muzik'],
        brief:
          'Sarayda Batı müziğinin yeri; piyano ve küçük dinletilerin diplomatik bir sahne olarak kullanılması.',
        lookFor: [
          'Piyanonun odadaki merkezî konumu',
          'Koltukların dinleme düzenine göre yerleşimi',
          'Duvarların ve perdelerin akustiğe etkisi',
        ],
        arriveBy: 'Mabeyn’den çıkıp müzik sesinin geldiği yöne, piyanolu odaya yönelin.',
      },
      {
        id: 'hamam',
        order: 6,
        title: 'Hünkâr Hamamı',
        titleEn: 'The Sultan’s Hammam',
        aliases: ['hamam', 'hünkar hamamı', 'hunkar hamami', 'banyo'],
        brief:
          'Mermer, kubbe ve ışığın bir araya geldiği ritüel mekânı. Hamamın saray hayatındaki gündelik ve törensel yeri.',
        lookFor: [
          'Mermer yüzeylerin damarları',
          'Kubbedeki ışık gözleri',
          'Yıkanma ve dinlenme bölümlerinin ayrımı',
        ],
        arriveBy: 'Müzik odasından çıkıp hamam yönündeki tabelayı izleyin; girişte eğilerek geçilen kapıyı arayın.',
      },
      {
        id: 'muayede',
        order: 7,
        title: 'Muayede Salonu',
        titleEn: 'The Ceremonial Hall',
        aliases: ['muayede', 'tören salonu', 'toren salonu', 'balo salonu', 'büyük salon', 'buyuk salon'],
        brief:
          'Sarayın en büyük tören alanı. Kubbe, avize ve boşluğun birlikte kurduğu iktidar sahnesi.',
        lookFor: [
          'Dünyanın en büyük kristal avizelerinden birinin ölçeği',
          'Kubbenin yüksekliği ve salonun boşluğu',
          'Bayramlaşma ve kabul törenlerinin bıraktığı düzen',
        ],
        arriveBy: 'Hamamdan çıkıp ana tören aksına dönün; Muayede Salonu’nun çift kanatlı kapısını arayın.',
      },
      {
        id: 'harem-giris',
        order: 8,
        title: 'Harem Girişi',
        titleEn: 'Entrance to the Harem',
        aliases: ['harem', 'harem girişi', 'harem girisi', 'harem kapısı', 'harem kapisi'],
        brief:
          'Selamlık’tan Harem’e geçiş: sarayın resmî ve mahrem dünyasını ayıran eşik. Harem’in bir “yasak bölge” değil, kendi hiyerarşisi olan bir yaşam alanı olduğu.',
        lookFor: [
          'Geçiş koridorunun daralması',
          'Kapıların yönü ve kontrol noktaları',
          'Selamlık ile Harem arasındaki süsleme farkı',
        ],
        arriveBy: 'Muayede’den çıkıp Harem yönündeki geçiş koridoruna girin.',
      },
      {
        id: 'kadinefendiler',
        order: 9,
        title: 'Kadınefendiler Salonu',
        titleEn: 'The Consorts’ Hall',
        aliases: ['kadınefendiler', 'kadinefendiler', 'kadın efendiler', 'kadin efendiler', 'harem salonu'],
        brief:
          'Harem’in gündelik yaşamı: oturma, misafirlik ve hiyerarşi. Saray kadınlarının görünmeyen düzenini mobilyadan okumak.',
        lookFor: [
          'Koltuk ve sedirlerin hiyerarşik yerleşimi',
          'Halı ve kumaş desenlerinin batılılaşması',
          'Pencerelerin dış dünyayla kurduğu ilişki',
        ],
        arriveBy: 'Harem girişinden düz ilerleyin; kadınefendilere ayrılan salonların tabelalarını izleyin.',
      },
      {
        id: 'sari-oda',
        order: 10,
        title: 'Sarı Oda',
        titleEn: 'The Yellow Room',
        aliases: ['sarı oda', 'sari oda', 'yellow room', 'altın oda', 'altin oda'],
        brief:
          'Altın varak, ayna ve tavanın birlikte çalıştığı törensel bir oda. Işığın mekânı nasıl büyüttüğü.',
        lookFor: [
          'Altın varakların ışıkla parlaması',
          'Aynaların odayı çoğaltması',
          'Tavan resminin merkezdeki etkisi',
        ],
        arriveBy: 'Kadınefendiler Salonu’ndan çıkıp Sarı Oda tabelasını izleyin.',
      },
      {
        id: 'ataturk-odasi',
        order: 11,
        title: 'Atatürk’ün Odası',
        titleEn: 'Atatürk’s Room',
        aliases: ['atatürk', 'ataturk', 'atatürk odası', 'ataturk odasi', 'yatak odası', 'son oda'],
        brief:
          'Cumhuriyet’in kurucusunun hayatının son günlerini geçirdiği oda. Sarayın imparatorluk geçmişiyle cumhuriyet tarihinin kesiştiği yer.',
        lookFor: [
          'Yatağın ve çalışma masasının sade düzeni',
          'Takvim ve kişisel eşyalar',
          'Odanın Boğaz’a ve dışarıya bakan penceresi',
        ],
        arriveBy: 'Sarı Oda’dan çıkıp Atatürk’ün odası yönündeki tabelayı izleyin.',
      },
      {
        id: 'japon-salonu',
        order: 12,
        title: 'Japon Salonu',
        titleEn: 'The Japanese Room',
        aliases: ['japon', 'japon salonu', 'japon odası', 'japon odasi'],
        brief:
          'Sarayın egzotizm merakı ve Japon sanatıyla kurduğu ilişki. Mekânın 20. yüzyıldaki restorasyon hikâyesi.',
        lookFor: [
          'Japon motifli duvar ve tavan süslemeleri',
          'Mobilyanın Batılı düzenine Japon detayların karışması',
          'Restorasyon izlerinin görünürlüğü',
        ],
        arriveBy: 'Atatürk’ün odasından çıkıp Japon Salonu tabelasını izleyin.',
      },
    ],
  },
]

export function findPlan(id: string | undefined): WalkPlan | undefined {
  if (!id) return WALK_PLANS[0]
  return WALK_PLANS.find((plan) => plan.id === id)
}

export function decodePlanId(value: string | null | undefined): string {
  return findPlan(value ?? undefined)?.id ?? WALK_PLANS[0].id
}

/**
 * The walk that belongs to a place the guide just identified. Matching is
 * deliberately loose: a report may call the palace "Dolmabahçe Sarayı" or
 * "Dolmabahçe Palace", and the walk must still be offered.
 */
export function walkPlanForPlace(place: string, title?: string): WalkPlan | undefined {
  const normalise = (value: string): string =>
    value
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const haystack = normalise(`${place} ${title ?? ''}`)
  if (!haystack) return undefined

  return WALK_PLANS.find((plan) => {
    const needles = [plan.place, plan.placeEn, plan.title, plan.titleEn].map(normalise)
    return needles.some((needle) => needle && (haystack.includes(needle) || needle.includes(haystack)))
  })
}

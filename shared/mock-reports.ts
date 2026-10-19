import type { AttractionReport, GuideLanguage } from './types'

export interface MockReport {
  id: string
  imageUrl: string
  report: AttractionReport
}

export const MOCK_REPORTS: MockReport[] = [
  {
    id: 'eiffel',
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80',
    report: {
      title: 'Eiffel Tower',
      kind: 'Wrought-iron lattice tower',
      location: { name: 'Paris', country: 'France', lat: 48.8584, lng: 2.2945 },
      era: '1887–1889',
      confidence: 97,
      summary:
        'Rising beside the Seine, the Eiffel Tower was built as a temporary gateway for the 1889 World’s Fair — and never left. Its open iron lattice, shaped to let the wind through, turned an engineering experiment into the symbol of Paris.',
      quickFacts: [
        { label: 'Height', value: '330 m' },
        { label: 'Iron pieces', value: '18,038' },
        { label: 'Rivets', value: '2.5 million' },
        { label: 'Visitors', value: '~7M / year' },
      ],
      trivia: [
        {
          id: 'eiffel-1',
          icon: 'calendar',
          label: 'Completed in',
          title: '1889',
          body: 'Built in two years, two months and five days for the Exposition Universelle — a construction speed that stunned Paris.',
        },
        {
          id: 'eiffel-2',
          icon: 'user',
          label: 'Designed by',
          title: 'Gustave Eiffel',
          body: 'His workshop also built the internal frame of the Statue of Liberty. The tower was his most audacious structural calculation.',
        },
        {
          id: 'eiffel-3',
          icon: 'sparkles',
          label: 'Meant to be',
          title: 'Temporary',
          body: 'It was scheduled for demolition after 20 years. Radio antennas at the top gave it a second life — and saved it.',
        },
        {
          id: 'eiffel-4',
          icon: 'palette',
          label: 'Repainted',
          title: 'Every 7 years',
          body: 'About 60 tonnes of paint protect the iron. The colour shifts subtly from bronze at the base to lighter gold at the top.',
        },
      ],
      visualReferences: [
        {
          id: 'eiffel-v1',
          x: 0.66,
          y: 0.29,
          title: 'The open lattice',
          body: '18,038 iron pieces joined by 2.5 million rivets. The gaps are not decoration: wind passes through instead of pushing the tower over.',
        },
        {
          id: 'eiffel-v2',
          x: 0.66,
          y: 0.52,
          title: 'Three observation decks',
          body: 'The first deck sits just above the arches. The second is the one you see halfway up; the third is enclosed at the summit.',
        },
        {
          id: 'eiffel-v3',
          x: 0.62,
          y: 0.7,
          title: 'The four base arches',
          body: 'These arches frame the legs and carry visitors to the lifts. Their curve is structural, not ornamental — it spreads the load into the ground.',
        },
        {
          id: 'eiffel-v4',
          x: 0.16,
          y: 0.86,
          title: 'The Seine below',
          body: 'The tower was placed on the riverbank so it could be seen from the 1889 fairgrounds across the water. Boats still pass under its shadow.',
        },
      ],
      sections: [
        {
          id: 'eiffel-s1',
          title: 'An engineering answer to wind',
          body: 'Look at the tower’s silhouette: it is wider at the base and narrows as it rises, following the curve of the wind pressure it must resist. Eiffel’s engineers calculated that the open lattice would let gusts pass through the structure rather than flat panels catching them. The result looks weightless from a distance, yet every diagonal you see is doing work.',
          seeInPhoto: 'The criss-cross iron lattice between the legs.',
        },
        {
          id: 'eiffel-s2',
          title: 'A tower that was never supposed to stay',
          body: 'Parisian artists and writers campaigned against it before it was built, calling it an iron eyesore. The original plan was to dismantle it after twenty years. What saved the tower was practicality: its height made it an ideal radio mast, and later a television transmitter. The temporary fairground gate became permanent infrastructure.',
          seeInPhoto: 'The antenna at the very top, the tower’s current job.',
        },
        {
          id: 'eiffel-s3',
          title: 'Why it looks lighter than it is',
          body: 'At ground level the four legs are massive, but they are hollow, braced shells. As the tower climbs, the legs merge into a single shaft and the ironwork becomes finer. The arches and decks break the mass into horizontal bands, so the eye reads rhythm instead of weight. From the river you see the whole machine at once: base, arch, deck, spire.',
          seeInPhoto: 'The merging legs, the arch band and the decks stacked above.',
        },
      ],
      suggestedQuestions: [
        'Why was it almost demolished?',
        'How was it built so quickly?',
        'What is inside the base?',
      ],
    },
  },
  {
    id: 'colosseum',
    imageUrl:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80',
    report: {
      title: 'Colosseum',
      kind: 'Flavian amphitheatre',
      location: { name: 'Rome', country: 'Italy', lat: 41.8902, lng: 12.4922 },
      era: '70–80 CE',
      confidence: 96,
      summary:
        'The largest amphitheatre ever built, the Colosseum packed fifty thousand spectators around a stage of sand, trapdoors and spectacle. Its broken outer ring is not a ruin of neglect alone — it is also a record of how Rome was recycled for centuries.',
      quickFacts: [
        { label: 'Capacity', value: '~50,000' },
        { label: 'Length', value: '189 m' },
        { label: 'Entrances', value: '80' },
        { label: 'Opened', value: '80 CE' },
      ],
      trivia: [
        {
          id: 'col-1',
          icon: 'crown',
          label: 'Begun by',
          title: 'Vespasian',
          body: 'Started around 70 CE on the drained private lake of Nero’s Golden House — a very public gift from the emperor to the people.',
        },
        {
          id: 'col-2',
          icon: 'sparkles',
          label: 'Opened with',
          title: '100 days of games',
          body: 'Titus inaugurated it in 80 CE with gladiator combat, wild-animal hunts and theatrical executions.',
        },
        {
          id: 'col-3',
          icon: 'layers',
          label: 'Hidden beneath',
          title: 'A backstage',
          body: 'The hypogeum beneath the arena held cages, lifts and tunnels. Animals and scenery appeared as if from nowhere.',
        },
        {
          id: 'col-4',
          icon: 'compass',
          label: 'Sheltered by',
          title: 'A fabric sky',
          body: 'Sailors from the imperial fleet worked a retractable awning, the velarium, to shade the crowd from the Roman sun.',
        },
      ],
      visualReferences: [
        {
          id: 'col-v1',
          x: 0.27,
          y: 0.31,
          title: 'The jagged upper wall',
          body: 'The outer arcade is missing because its stone was quarried away in the Middle Ages. The clean, tall curve on the right is a 19th-century buttress holding the rest up.',
        },
        {
          id: 'col-v2',
          x: 0.4,
          y: 0.53,
          title: 'Three orders of arches',
          body: 'Each level uses a different column order — Tuscan, then Ionic, then Corinthian. The arches let light in and reduced the weight of the facade.',
        },
        {
          id: 'col-v3',
          x: 0.64,
          y: 0.52,
          title: 'The exposed arena',
          body: 'The floor is gone, revealing the hypogeum below. In its day a wooden stage covered this whole oval and the crowd saw only sand.',
        },
        {
          id: 'col-v4',
          x: 0.47,
          y: 0.75,
          title: 'Pitted travertine',
          body: 'The small holes in the stone once held iron clamps. Medieval builders cut the clamps out, leaving the scars you can still see.',
        },
      ],
      sections: [
        {
          id: 'col-s1',
          title: 'A stadium built on a lake',
          body: 'Nero’s enormous private park and artificial lake sat here until the Flavian emperors reclaimed it. Draining the lake and pouring the foundations was as much a political act as an engineering one: the space of a tyrant became the stage of the people.',
          seeInPhoto: 'The low, wide oval footprint of the arena.',
        },
        {
          id: 'col-s2',
          title: 'The machine beneath the sand',
          body: 'The hypogeum was a two-level service floor of corridors, animal pens and capstans. Lifts pushed scenery and animals through trapdoors in the wooden arena. When the floor was removed by later excavators, the backstage became the view — one reason the Colosseum feels so modern today.',
          seeInPhoto: 'The maze of walls visible inside the arena oval.',
        },
        {
          id: 'col-s3',
          title: 'What the missing half tells us',
          body: 'The Colosseum was not simply abandoned. It was quarried: stone, iron and marble were reused in churches and palaces across Rome. The holes in the travertine are where clamps were cut out. Preservation began in earnest in the 19th century, which is why one side now looks “finished” and the other still looks broken.',
          seeInPhoto: 'The contrast between the ruined left rim and the smooth right buttress.',
        },
      ],
      suggestedQuestions: [
        'Could they really flood the arena?',
        'How did 50,000 people get out?',
        'What happened to the missing stone?',
      ],
    },
  },
  {
    id: 'blue-mosque',
    imageUrl:
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=80',
    report: {
      title: 'Blue Mosque',
      kind: 'Ottoman imperial mosque',
      location: { name: 'Istanbul', country: 'Türkiye', lat: 41.0054, lng: 28.9768 },
      era: '1609–1617',
      confidence: 95,
      summary:
        'Sultan Ahmed I built his mosque directly opposite Hagia Sophia, daring a comparison with the Byzantine masterpiece. The result is a cascade of domes and six slender minarets, and an interior that gave the building its nickname: the Blue Mosque.',
      quickFacts: [
        { label: 'Minarets', value: '6' },
        { label: 'İznik tiles', value: '20,000+' },
        { label: 'Main dome', value: '23.5 m' },
        { label: 'Architect', value: 'Sedefkar Mehmed Ağa' },
      ],
      trivia: [
        {
          id: 'blue-1',
          icon: 'crown',
          label: 'Commissioned by',
          title: 'Sultan Ahmed I',
          body: 'He was 19 when construction began. The mosque was part of a larger complex with a madrasa, hospital and market.',
        },
        {
          id: 'blue-2',
          icon: 'palette',
          label: 'Famous for',
          title: '20,000 tiles',
          body: 'Handmade İznik tiles in more than fifty tulip and carnation patterns cover the interior walls — the source of the building’s nickname.',
        },
        {
          id: 'blue-3',
          icon: 'sparkles',
          label: 'A famous',
          title: 'Misunderstanding',
          body: 'The sultan reportedly asked for altın (gold) minarets. The architect heard altı (six) — and built six instead.',
        },
        {
          id: 'blue-4',
          icon: 'compass',
          label: 'Still today',
          title: 'A working mosque',
          body: 'Five times a day the call to prayer sounds from these minarets. Visitors enter between prayers, shoes off and shoulders covered.',
        },
      ],
      visualReferences: [
        {
          id: 'blue-v1',
          x: 0.48,
          y: 0.37,
          title: 'The central dome',
          body: '23.5 metres across, ringed by four semi-domes. The cascade of roofs is designed to carry the eye — and the structural load — down to the ground.',
        },
        {
          id: 'blue-v2',
          x: 0.23,
          y: 0.17,
          title: 'Six minarets',
          body: 'Only the Grand Mosque in Mecca had as many at the time. The slender shafts make the mosque look taller than its stone mass.',
        },
        {
          id: 'blue-v3',
          x: 0.52,
          y: 0.57,
          title: 'The descending domes',
          body: 'Each half-dome steps down around the centre. From the courtyard they read as a fountain of stone; inside, they open the ceiling into light.',
        },
        {
          id: 'blue-v4',
          x: 0.44,
          y: 0.81,
          title: 'The courtyard arcade',
          body: 'The last row of small domes at the base belongs to the arcade around the courtyard, where ablution fountains once stood.',
        },
      ],
      sections: [
        {
          id: 'blue-s1',
          title: 'Light through 260 windows',
          body: 'The dome is not supported by massive walls alone. A ring of windows at its base floods the interior with daylight, making the ceiling seem to float. The tiles are blue-green, so the light bouncing around the prayer hall carries a cool tint — the effect early travellers described as being inside a blue shell.',
          seeInPhoto: 'The bright band of windows under the main dome.',
        },
        {
          id: 'blue-s2',
          title: 'The tile workshops of İznik',
          body: 'The tiles were made in İznik, a town south-east of Istanbul famous for its ceramics. Each tile was painted by hand before firing. Tulips, carnations and vines repeat across the walls in dozens of variations, so the interior never reads as a single flat pattern.',
          seeInPhoto: 'The blue-green skin of the interior walls (visible through the doorway).',
        },
        {
          id: 'blue-s3',
          title: 'Why the silhouette is so busy',
          body: 'A single dome can look heavy. By surrounding it with half-domes and topping the corners with small cupolas, the architect turned the roof into a gradual staircase. The six minarets add vertical lines that balance the horizontal spread. From this angle, the building looks less like one dome and more like a small mountain range.',
          seeInPhoto: 'The stepped roofline and the six vertical minarets.',
        },
      ],
      suggestedQuestions: [
        'Is the six-minaret story true?',
        'Why is it called the Blue Mosque?',
        'Can non-Muslims visit?',
      ],
    },
  },
]

export function mockReportForSeed(seed: string): MockReport {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return MOCK_REPORTS[hash % MOCK_REPORTS.length]
}

const MOCK_CHAT: Record<string, string[]> = {
  eiffel: [
    'The tower survived because its height made it useful. From 1903 it carried military radio equipment, and later broadcast antennas. Demolition stopped being practical long before anyone decided it was beautiful.',
    'It was assembled from prefabricated iron pieces in a factory outside Paris, then raised on site with cranes and hand riveting. About 250 workers assembled it in just over two years — a speed made possible by 5,300 detailed drawings.',
    'Inside the four legs are lifts, stairs, shops and the engine rooms that run the lifts. The first floor also has a glass floor, and Gustave Eiffel’s small apartment sits near the top.',
  ],
  colosseum: [
    'Possibly, but only in its earliest years and on a limited scale. Channels and evidence of water management exist, but historians debate whether full mock sea battles were staged after the hypogeum was built.',
    'Efficiently. Eighty numbered entrances, including special gates for the emperor and for the dead, let the crowd leave in a matter of minutes. Tickets were free and assigned to specific sectors.',
    'It was reused as a quarry for centuries. Travertine, marble and iron clamps went into churches, palaces and even St. Peter’s Basilica. The holes you see are where clamps were cut out.',
  ],
  'blue-mosque': [
    'It is a popular story rather than a documented fact. The mosque does have six minarets, which was unusual and caused a diplomatic problem because Mecca’s Grand Mosque also had six; the sultan later paid for a seventh in Mecca.',
    'Because of the tens of thousands of blue-green İznik tiles lining the interior. The nickname was given by European visitors; locals usually call it Sultan Ahmed Mosque.',
    'Yes, outside prayer times. Visitors enter through a separate entrance, remove their shoes, and cover shoulders and knees. Women are asked to cover their hair.',
  ],
}

export function mockChatAnswer(report: AttractionReport, question: string): string {
  const entry = MOCK_REPORTS.find((item) => item.report.title === report.title)
  const answers = MOCK_CHAT[entry?.id ?? 'eiffel'] ?? MOCK_CHAT.eiffel
  const normalized = question.toLowerCase()
  if (normalized.includes('build') || normalized.includes('construct')) return answers[1]
  if (normalized.includes('inside') || normalized.includes('visit')) return answers[2]
  if (normalized.includes('why') || normalized.includes('how')) return answers[0]
  return `${answers[0]} If you want, ask me about a specific detail you can see in your photo — I can point to it.`
}

/** Localised placeholder copy used while the guide is being written. */
export const ANALYZING_MESSAGES: Record<GuideLanguage, string[]> = {
  en: [
    'Reading the frame…',
    'Recognising the place…',
    'Checking the location…',
    'Collecting four stories…',
    'Writing your guide…',
  ],
  tr: [
    'Kare okunuyor…',
    'Yer tanınıyor…',
    'Konum kontrol ediliyor…',
    'Dört hikâye toplanıyor…',
    'Rehberin yazılıyor…',
  ],
}

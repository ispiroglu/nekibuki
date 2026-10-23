import { describe, expect, test } from 'bun:test'
import type { WalkPlanContext } from '../worker/walk/plan'
import { composeWalkPlan, parsePlannerOutput, PlanValidationError } from '../worker/walk/plan'
import type { WalkPoi } from '../worker/lib/overpass'
import { parseOverpass } from '../worker/lib/overpass'
import { arrivalInstruction, distanceMeters } from '../worker/lib/geo'

const origin = { latitude: 41.0054, longitude: 28.9768 }

const candidate = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
): WalkPoi => ({
  id,
  name,
  kind: 'historic',
  latitude,
  longitude,
  distance: Math.round(distanceMeters(origin, { latitude, longitude })),
  tags: { name, historic: 'yes' },
})

const candidates = [
  candidate('node/1', 'Ayasofya', 41.0086, 28.9802),
  candidate('node/2', 'Topkapı Sarayı', 41.0115, 28.9833),
  candidate('node/3', 'Sultanahmet Camii', 41.0054, 28.9768),
  candidate('node/4', 'Yerebatan Sarnıcı', 41.0084, 28.9779),
  candidate('node/5', 'Gülhane Parkı', 41.0128, 28.9815),
  candidate('node/6', 'Arkeoloji Müzesi', 41.0116, 28.9815),
]

const context: WalkPlanContext = {
  analysisId: 'analysis-1',
  title: 'Sultanahmet',
  summary: 'A square between two empires.',
  place: 'Sultanahmet',
  country: 'Türkiye',
  location: origin,
  language: 'tr',
}

const output = {
  title: 'Meydandan saraya',
  titleEn: 'From the square to the palace',
  minutes: 70,
  intro: 'Bu tur bulunduğun noktadan başlıyor.',
  stops: [
    {
      candidateId: 'node/2',
      title: 'Topkapı Sarayı',
      titleEn: 'Topkapı Palace',
      brief: 'İmparatorluğun kalbi burada atıyordu.',
      lookFor: ['Bâb-ı Hümâyûn', 'Avlu kapıları'],
    },
    {
      candidateId: 'node/1',
      title: 'Ayasofya',
      titleEn: 'Hagia Sophia',
      brief: 'İki dinin ve iki bin yılın üst üste durduğu yapı.',
      lookFor: ['Kubbe', 'Mozaikler'],
    },
    {
      candidateId: 'node/4',
      title: 'Yerebatan Sarnıcı',
      titleEn: 'Basilica Cistern',
      brief: 'Şehrin altındaki sessiz su deposu.',
      lookFor: ['Medusa başı', 'Sütun ormanı'],
    },
    {
      candidateId: 'node/5',
      title: 'Gülhane Parkı',
      titleEn: 'Gülhane Park',
      brief: 'Sarayın bahçesinden halkın parkına dönüşen yer.',
      lookFor: ['Eski ağaçlar', 'Saray surları'],
    },
    {
      candidateId: 'node/3',
      title: 'Sultanahmet Camii',
      titleEn: 'Sultanahmet Mosque',
      brief: 'Meydanın etrafında kurulan altı minareli cami.',
      lookFor: ['İznik çinileri', 'Avlu revakları'],
    },
  ],
}

describe('walk geometry', () => {
  test('distance is plausible for two Istanbul points', () => {
    const distance = distanceMeters(origin, { latitude: 41.0086, longitude: 28.9802 })
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(500)
  })

  test('arrival text uses a walkable distance and a Turkish dative', () => {
    const text = arrivalInstruction(origin, { latitude: 41.0086, longitude: 28.9802 }, 'tr', {
      start: true,
    })
    expect(text).toContain('Tur buradan başlıyor')
    expect(text).toMatch(/m (kuzeye|kuzeydoğuya|doğuya|güneydoğuya|güneye|güneybatıya|batıya|kuzeybatıya)/)
  })
})

describe('overpass parsing', () => {
  test('keeps named, positioned places, dedupes and sorts by distance', () => {
    const pois = parseOverpass(
      {
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 41.0115,
            lon: 28.9833,
            tags: { name: 'Topkapı Sarayı', historic: 'yes' },
          },
          {
            type: 'node',
            id: 2,
            lat: 41.0054,
            lon: 28.9768,
            tags: { name: 'Sultanahmet Camii', tourism: 'attraction' },
          },
          // A second record with the same name must not become a second stop.
          {
            type: 'way',
            id: 3,
            center: { lat: 41.0116, lon: 28.9834 },
            tags: { name: 'Topkapı Sarayı', tourism: 'museum' },
          },
          { type: 'node', id: 4, lat: 41.0055, lon: 28.9769, tags: {} },
        ],
      },
      origin,
    )

    expect(pois).toHaveLength(2)
    expect(pois[0]?.name).toBe('Sultanahmet Camii')
    expect(pois[0]?.distance).toBeLessThan(pois[1]!.distance)
    expect(pois[0]?.kind).toBe('attraction')
  })
})

describe('planner output', () => {
  test('parses fenced JSON and rejects invented fields', () => {
    const parsed = parsePlannerOutput('```json\n' + JSON.stringify(output) + '\n```')
    expect(parsed.stops).toHaveLength(5)

    expect(() =>
      parsePlannerOutput(
        JSON.stringify({
          ...output,
          stops: output.stops.slice(0, 2),
        }),
      ),
    ).toThrow(PlanValidationError)
  })

  test('coordinates come from OSM and the nearest chosen stop starts the walk', () => {
    const plan = composeWalkPlan(context, candidates, output, 'generated-1')

    expect(plan.stops[0]?.title).toBe('Sultanahmet Camii')
    expect(plan.stops[0]?.latitude).toBe(41.0054)
    expect(plan.stops[0]?.longitude).toBe(28.9768)
    expect(plan.stops[0]?.arriveBy).toContain('Tur buradan başlıyor')
    expect(plan.stops[1]?.arriveBy).toContain('Önceki duraktan')
    expect(plan.source).toBe('generated')
    expect(plan.analysisId).toBe('analysis-1')
    expect(plan.origin).toEqual(origin)
  })

  test('a chosen id outside the candidate list is rejected', () => {
    const invented = {
      ...output,
      stops: [
        { ...output.stops[0], candidateId: 'node/999' },
        ...output.stops.slice(1),
      ],
    }
    expect(() => composeWalkPlan(context, candidates, invented, 'generated-2')).toThrow(
      PlanValidationError,
    )
  })
})

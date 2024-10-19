import { NextNanika } from '../../src/main.js'

describe('makeClient()', () => {
  it('should return instance of Client', () => {
    expect(typeof makeClient({ auth: 'dummy' })).toBe('object')
  })
})

describe('run()', () => {
  it('should be defined', () => {
    expect(run).toBeDefined()
  })
})

describe('cleanup()', () => {
  it('should be defined', () => {
    expect(cleanup).toBeDefined()
  })
})

describe('makeBasicTimeRecGenerator()', () => {
  const mockTimeTable = [
    {
      dayKind: [],
      recs: [
        { icon: '#️⃣', start: { hh: 10, mm: 0 } },
        { start: { hh: 14, mm: 0 }, tags: ['test'] },
        { start: { hh: 18, mm: 0 }, end: { hh: 14, mm: 10 } }
      ]
    },
    {
      dayKind: ['SAT', 'SUN'],
      recs: [
        { start: { hh: 9, mm: 30 } },
        { start: { hh: 14, mm: 0 }, tags: ['test'] },
        { start: { hh: 16, mm: 0 } }
      ]
    }
  ]

  it('should generate entries for a matching dayKind', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable)
    const options = {
      dayKind: 'SAT',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { start: { hh: 9, mm: 30 }, tags: [[], []] },
      { start: { hh: 14, mm: 0 }, tags: [[], ['test']] },
      { start: { hh: 16, mm: 0 }, tags: [[], []] }
    ])
  })
})

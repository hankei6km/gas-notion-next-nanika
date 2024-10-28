import { NextNanika } from '../src/next-nanika.js'
import { makeBasicTimeRecGenerator } from '../src/generator.js'

const mockTimeTable: NextNanika.TimeTableEntry[] = [
  {
    dayKind: [],
    recs: [
      { icon: '#️⃣', start: { hh: 10, mm: 0 } },
      { name: 'Test Event', start: { hh: 14, mm: 0 }, tags: [['test']] },
      { start: { hh: 18, mm: 0 }, end: { hh: 14, mm: 10 } }
    ]
  },
  {
    dayKind: ['SAT', 'SUN'],
    recs: [
      { start: { hh: 9, mm: 30 } },
      { start: { hh: 14, mm: 0 }, tags: [['test']] },
      { start: { hh: 16, mm: 0 } }
    ]
  }
]

describe('makeBasicTimeRecGenerator', () => {
  it('should generate entries for a matching dayKind', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable)
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'SAT',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { start: { hh: 9, mm: 30 }, tags: [[]] },
      { start: { hh: 14, mm: 0 }, tags: [[], ['test']] },
      { start: { hh: 16, mm: 0 }, tags: [[]] }
    ])
  })

  it('should generate entries for a non-matching dayKind using the first entry', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable)
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'MON',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { icon: '#️⃣', start: { hh: 10, mm: 0 }, tags: [[]] },
      { name: 'Test Event', start: { hh: 14, mm: 0 }, tags: [[], ['test']] },
      { start: { hh: 18, mm: 0 }, end: { hh: 14, mm: 10 }, tags: [[]] }
    ])
  })

  it('should handle entries without tags or end time', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable)
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'SUN',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { start: { hh: 9, mm: 30 }, tags: [[]] },
      { start: { hh: 14, mm: 0 }, tags: [[], ['test']] },
      { start: { hh: 16, mm: 0 }, tags: [[]] }
    ])
  })

  it('should generate entries with group tag when group is provided', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable, [
      'group1',
      'group2'
    ])
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'SAT',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { start: { hh: 9, mm: 30 }, tags: [['group1', 'group2']] },
      { start: { hh: 14, mm: 0 }, tags: [['group1', 'group2'], ['test']] },
      { start: { hh: 16, mm: 0 }, tags: [['group1', 'group2']] }
    ])
  })

  it('should generate entries with group tag for a non-matching dayKind using the first entry', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable, ['group'])
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'MON',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { icon: '#️⃣', start: { hh: 10, mm: 0 }, tags: [['group']] },
      {
        name: 'Test Event',
        start: { hh: 14, mm: 0 },
        tags: [['group'], ['test']]
      },
      {
        start: { hh: 18, mm: 0 },
        end: { hh: 14, mm: 10 },
        tags: [['group']]
      }
    ])
  })

  it('should handle entries without tags or end time and include group tag', () => {
    const generator = makeBasicTimeRecGenerator(mockTimeTable, ['group'])
    const options: NextNanika.TimeRecGeneratorOptions = {
      dayKind: 'SUN',
      baseTime: new Date()
    }
    const entries = Array.from(generator(options))

    expect(entries).toEqual([
      { start: { hh: 9, mm: 30 }, tags: [['group']] },
      { start: { hh: 14, mm: 0 }, tags: [['group'], ['test']] },
      { start: { hh: 16, mm: 0 }, tags: [['group']] }
    ])
  })
})

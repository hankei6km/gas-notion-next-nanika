import { NextNanika } from './next-nanika.js'

export function makeBasicTimeRecGenerator(
  timeTable: NextNanika.TimeTableEntry[],
  group: string[] = []
): NextNanika.TimeRecGenerator {
  return function* basicTimeRecGenerator(
    opts: NextNanika.TimeRecGeneratorOptions
  ) {
    const { dayKind } = opts

    const matchedEntry = timeTable.find((entry) =>
      entry.dayKind.includes(dayKind)
    )
    const recs = matchedEntry ? matchedEntry.recs : timeTable[0].recs

    for (const rec of recs) {
      const e: NextNanika.Entry = {
        icon: rec.icon,
        name: rec.name,
        start: {
          hh: rec.start.hh,
          mm: rec.start.mm
        },
        tags: [group, rec.tags || []]
      }
      if (rec.end) {
        e.end = {
          hh: rec.end.hh,
          mm: rec.end.mm
        }
      }
      yield e
    }
  }
}

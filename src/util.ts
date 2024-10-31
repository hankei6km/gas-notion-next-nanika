import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints'
import { ContentRaw, toContent } from 'notion2content'
import { NextNanika } from './next-nanika.js'

export function padNN(n: number): string {
  return n.toString().padStart(2, '0')
}

export function tzString(offset: number): string {
  const sign = offset > 0 ? '-' : '+'
  const absOffset = Math.abs(offset)
  const hours = Math.floor(absOffset / 60)
  const minutes = absOffset % 60
  return `${sign}${padNN(hours)}:${padNN(minutes)}`
}

export function makeDayKindGetter(
  calendarIds: string[] = ['']
): NextNanika.GetDayKind {
  return function getDayKind(baseTime: Date): NextNanika.DayKind {
    let isHoliday = false
    for (const calendar of calendarIds) {
      const holidayCalendar = CalendarApp.getCalendarById(calendar)
      if (holidayCalendar.getEventsForDay(baseTime).length > 0) {
        isHoliday = true
        break
      }
    }
    if (isHoliday === false) {
      switch (baseTime.getDay()) {
        case 0:
          return 'SUN'
        case 1:
          return 'MON'
        case 2:
          return 'TUE'
        case 3:
          return 'WED'
        case 4:
          return 'THU'
        case 5:
          return 'FRI'
        case 6:
          return 'SAT'
      }
    }
    return 'HOL'
  }
}

export function formatHHMMOver24Hours(
  baseTime: Date,
  hh: number,
  mm: number,
  tz: string,
  changeHH: number
): string {
  const hh24 = hh % 24
  const t =
    hh24 < changeHH
      ? new Date(baseTime.getTime() + 86400000 /*24 * 60 * 60 * 1000*/)
      : baseTime
  return `${t.getFullYear()}-${padNN(t.getMonth() + 1)}-${padNN(
    t.getDate()
  )}T${padNN(hh24)}:${padNN(mm)}:00.000${tz /* Notion でも有効 */}`
}

export async function chkRecsAlreadyExist(
  client: NextNanika.BaseClient,
  databaseId: string,
  baseTime: Date,
  changeHH: number,
  propName: string
): Promise<boolean> {
  const start = formatHHMMOver24Hours(
    baseTime,
    changeHH + 1,
    0,
    tzString(baseTime.getTimezoneOffset()),
    changeHH
  )
  const response = await client.queryDatabases({
    database_id: databaseId,
    filter: {
      property: propName,
      date: {
        on_or_after: start
      }
    }
  })
  return response.results.length > 0
}

const timeStampRegExtp = new RegExp('(@time|@startTime|@date|@startDate)')

export function isTimeStampIncluded(text: string): boolean {
  return timeStampRegExtp.test(text)
}

export function titleParams(
  text: string,
  startTime: string,
  endTime: string | null
): Extract<
  CreatePageParameters['properties'][keyof CreatePageParameters['properties']],
  { type?: 'title'; title: any }
>['title'] {
  const texts = text.split(timeStampRegExtp).filter(Boolean)
  return texts.map((t: string) => {
    if (t === '@time') {
      return {
        mention: {
          date: {
            start: startTime,
            end: endTime ? endTime : null
          }
        }
      }
    } else if (t === '@startTime') {
      return {
        mention: {
          date: {
            start: startTime
          }
        }
      }
    } else if (t === '@date') {
      return {
        mention: {
          date: {
            start: startTime.split('T')[0],
            end: endTime ? endTime.split('T')[0] || null : null
          }
        }
      }
    } else if (t === '@startDate') {
      return {
        mention: {
          date: {
            start: startTime.split('T')[0]
          }
        }
      }
    }
    return {
      text: {
        content: t
      }
    }
  })
}

export async function cleanup(
  client: NextNanika.BaseClient,
  databaseId: string,
  baseTime: Date,
  minutesAgo: number,
  propName: string
): Promise<void> {
  //const start = new Date(baseTime.getTime() - minutesAgo * 60000).toISOString()
  const s = new Date(baseTime.getTime() - minutesAgo * 60000)
  const start = formatHHMMOver24Hours(
    s,
    s.getHours(),
    s.getMinutes(),
    tzString(baseTime.getTimezoneOffset()),
    0
  )
  try {
    const ite = toContent(client, {
      target: ['props'],
      query: {
        database_id: databaseId,
        filter: {
          property: propName,
          date: {
            on_or_before: start
          }
        }
      },
      toItemsOpts: {},
      toHastOpts: {}
    })
    for await (const content of ite) {
      // 大量(取得 API の実行が複数回になる場合)に削除する場合、正常に動作する？
      await client.trashPage(content.id)
    }
  } catch (e) {
    console.error(e)
  }
}

export class GatherTimeRecs {
  private client: NextNanika.BaseClient
  private databaseId: string
  private baseTime: Date
  private changeHH: number
  private propNames: NextNanika.PropNames
  private recs: ContentRaw[] = []

  constructor(
    client: NextNanika.BaseClient,
    databaseId: string,
    baseTime: Date,
    changeHH: number,
    propNames: NextNanika.PropNames
  ) {
    this.client = client
    this.databaseId = databaseId
    this.baseTime = baseTime
    this.changeHH = changeHH
    this.propNames = propNames
  }

  async gather() {
    const start = formatHHMMOver24Hours(
      this.baseTime,
      this.changeHH + 1,
      0,
      tzString(this.baseTime.getTimezoneOffset()),
      this.changeHH
    )
    const ite = toContent(this.client, {
      target: ['props'],
      query: {
        database_id: this.databaseId,
        filter: {
          property: this.propNames.time,
          date: {
            on_or_after: start
          }
        }
      },
      toItemsOpts: {},
      toHastOpts: {}
    })
    for await (const content of ite) {
      if (
        content.props &&
        typeof content.props[this.propNames.time] === 'object'
      ) {
        this.recs.push(content)
      }
    }
  }
  isExist(name: string, start: string, end: string, tags: string[][]): boolean {
    return this.recs.some((rec) => {
      const recName = rec.props?.[this.propNames.name]
      const recTime = rec.props?.[this.propNames.time]
      const recTags = this.propNames.tags.map((tags) => rec.props?.[tags])
      const l = recTags.length - tags.length
      let ttags = tags
      if (l > 0) {
        // tags が少ない場合は `[]` を追加
        ttags = tags.concat(Array(l).fill([]))
      }
      return (
        (isTimeStampIncluded(name) || recName === name) &&
        (recTime as any).start === start &&
        (recTime as any).end === end &&
        recTags.every(
          (recTag, index) =>
            Array.isArray(recTag) &&
            recTag.length === ttags[index].length &&
            recTag.every((tag, tagIndex) => tag === ttags[index][tagIndex])
        )
      )
    })
  }
}

import { makeClient as makeClientT } from './client.js'
import { makeBasicTimeRecGenerator as makeBasicTimeRecGeneratorT } from './generator.js'
import {
  cleanup as cleanupT,
  formatHHMMOver24Hours,
  GatherTimeRecs,
  makeDayKindGetter as makeDayKindGetterT,
  padNN,
  titleParams,
  tzString
} from './util.js'

export namespace NextNanika {
  /**
   * Represents the options for the client.
   * @typedef {Object} ClientOpts
   * @property {string} auth - The auth token for the Notion API.
   */
  export type ClientOpts = {
    /**
     * The auth token for the Notion API.
     */
    auth: string
  }

  type N2CClient = import('notion2content').Client
  type NotionClient = import('@notionhq/client').Client
  /**
   * @extends {import('notion2content').Client}
   */
  export declare abstract class BaseClient {
    abstract queryDatabases: N2CClient['queryDatabases']
    abstract listBlockChildren: N2CClient['listBlockChildren']
    abstract createPage(
      ...args: Parameters<NotionClient['pages']['create']>
    ): ReturnType<NotionClient['pages']['create']>
    abstract trashPage(
      pageId: string
    ): Promise<Awaited<ReturnType<NotionClient['pages']['update']>>>
  }

  export type DayKind<T extends string = never> =
    | 'SUN'
    | 'MON'
    | 'TUE'
    | 'WED'
    | 'THU'
    | 'FRI'
    | 'SAT'
    | 'HOL'
    | T

  export type GetDayKind<T extends string = never> = (
    baseTime: Date
  ) => DayKind<T>

  export type PropNames = {
    name: string
    time: string
    tags: string[]
  }

  type CreatePageParameters =
    import('@notionhq/client/build/src/api-endpoints').CreatePageParameters
  export type TimeRecGeneratorOptions<T extends string = never> = {
    dayKind: DayKind<T>
    baseTime: Date
  }
  type Icon = Extract<CreatePageParameters['icon'], { emoji: any }>['emoji'] // EmojiRequest
  export type Entry = {
    icon?: Icon
    name?: string
    start: {
      hh: number
      mm: number
    }
    end?: {
      hh: number
      mm: number
    }
    tags: string[][]
  }
  export type TimeRec = {
    icon?: NextNanika.Entry['icon']
    name?: string
    start: {
      hh: number
      mm: number
    }
    end?: {
      hh: number
      mm: number
    }
    tags?: string[][]
  }
  export type TimeTableEntry<T extends string = never> = {
    dayKind: NextNanika.DayKind<T>[]
    recs: TimeRec[]
  }
  export type TimeRecGenerator<T extends string = never> = (
    opts: TimeRecGeneratorOptions<T>
  ) => Generator<Entry, void, unknown>

  export type NextNanikaOptions<T extends string = never> = {
    databaseId: string
    timeRecGenerator: TimeRecGenerator<T> | TimeRecGenerator<T>[]
    propNames: PropNames
    dayKindGetter?: GetDayKind<T>
    startDaysOffset?: number
    daysToProcess?: number
    limit?: number
    skipCleanup?: boolean
  }

  export function makeClient(opts: ClientOpts): BaseClient {
    return makeClientT(opts)
  }
  function isLimitReached(
    opts: Pick<NextNanikaOptions, 'limit'>,
    createdCount: number
  ): boolean {
    return typeof opts.limit === 'number' && createdCount >= opts.limit
  }

  export function makeDayKindGetter(
    calendarIds: string[] = ['ja.japanese#holiday@group.v.calendar.google.com']
  ): GetDayKind {
    return makeDayKindGetterT(calendarIds)
  }

  export async function cleanup(
    client: BaseClient,
    databaseId: string,
    minutesAgo: number,
    propName: string
  ) {
    return cleanupT(client, databaseId, new Date(), minutesAgo, propName)
  }
  export async function run<T extends string = never>(
    client: BaseClient,
    opts: NextNanikaOptions<T>
  ) {
    // 基本とする時刻、tz は実行環境を尊重する
    // (GAS ならライブラリのコードを呼び出しているプロジェクトの設定に従う)
    const baseTime = new Date(
      new Date().getTime() +
        (opts.startDaysOffset || 0) * 86400000 /*24 * 60 * 60 * 1000*/
    )
    const tz = tzString(baseTime.getTimezoneOffset())

    if (opts.skipCleanup !== true) {
      console.log('start: cleanup')
      await cleanupT(
        client,
        opts.databaseId,
        new Date(baseTime.getTime()),
        1440, // 24 * 60
        opts.propNames.time
      )
      console.log('end: cleanup')
    } else {
      console.log('skipped: cleanup')
    }
    console.log('start: gather')
    const recs = new GatherTimeRecs(
      client,
      opts.databaseId,
      baseTime,
      2,
      opts.propNames
    )
    await recs.gather()
    console.log('end: gather')
    const daysToProcess =
      typeof opts.daysToProcess === 'number' ? opts.daysToProcess : 3
    let createdCount = 0
    const dayKindGetter = opts.dayKindGetter || makeDayKindGetter()
    for (
      let dayOffset = 0;
      dayOffset < daysToProcess && !isLimitReached(opts, createdCount);
      dayOffset++
    ) {
      const currentBaseTime = new Date(
        baseTime.getTime() + dayOffset * 86400000 /*24 * 60 * 60 * 1000*/
      )
      const timeRecGenerators = Array.isArray(opts.timeRecGenerator)
        ? opts.timeRecGenerator
        : [opts.timeRecGenerator]
      for (
        let timeRecGeneratorIdx = 0;
        timeRecGeneratorIdx < timeRecGenerators.length &&
        !isLimitReached(opts, createdCount);
        timeRecGeneratorIdx++
      ) {
        const timeRecGenerator = timeRecGenerators[timeRecGeneratorIdx]
        const timeRecs = timeRecGenerator({
          dayKind: dayKindGetter(currentBaseTime),
          baseTime: currentBaseTime
        })
        for (const timeRec of timeRecs) {
          const name =
            timeRec.name ||
            `${padNN(timeRec.start.hh)}:${padNN(timeRec.start.mm)}`
          const startTime = formatHHMMOver24Hours(
            currentBaseTime,
            timeRec.start.hh,
            timeRec.start.mm,
            tz,
            2
          )
          const endTime = timeRec.end
            ? formatHHMMOver24Hours(
                currentBaseTime,
                timeRec.end.hh,
                timeRec.end.mm,
                tz,
                2
              )
            : null
          if (!recs.isExist(name, startTime, endTime || '', timeRec.tags)) {
            const params: Parameters<BaseClient['createPage']>[0] = {
              parent: {
                database_id: opts.databaseId
              },
              properties: {
                [opts.propNames.name]: {
                  title: titleParams(name, startTime, endTime)
                },
                [opts.propNames.time]: {
                  date: {
                    start: startTime,
                    end: endTime
                  }
                }
              }
            }
            for (
              let idx = 0;
              idx < timeRec.tags.length && opts.propNames.tags.length;
              idx++
            ) {
              if (Array.isArray(timeRec.tags[idx])) {
                params.properties[opts.propNames.tags[idx]] = {
                  multi_select: timeRec.tags[idx].map((tag) => ({ name: tag }))
                }
              }
            }
            if (timeRec.icon) {
              params.icon = {
                type: 'emoji',
                emoji: timeRec.icon
              }
            }
            await client.createPage(params)
            createdCount++
            console.log(`created(${dayOffset}:${createdCount}): ${name}`) // TODO: ログ出力は外部から操作できるようにする
          } else {
            console.log('already exist')
          }
          if (isLimitReached(opts, createdCount)) {
            console.log('limit reached')
            timeRecs.return()
            //break
          }
        }
      }
    }
    console.log(`created ${createdCount} pages`)
  }

  export function makeBasicTimeRecGenerator<T extends string = never>(
    timeTable: TimeTableEntry<T>[],
    group: string[]
  ) {
    return makeBasicTimeRecGeneratorT<T>(timeTable, group)
  }
}

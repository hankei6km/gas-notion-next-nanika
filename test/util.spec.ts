import { jest } from '@jest/globals'
import {
  padNN,
  makeDayKindGetter,
  tzString,
  formatHHMMOver24Hours,
  chkRecsAlreadyExist,
  isTimeStampIncluded,
  titleParams,
  cleanup,
  GatherTimeRecs
} from '../src/util'
import { NextNanika } from '../src/next-nanika'
import type { Client } from '../src/client'

describe('padNN', () => {
  it('should pad single digit numbers with a leading zero', () => {
    expect(padNN(5)).toBe('05')
  })

  it('should not pad double digit numbers', () => {
    expect(padNN(12)).toBe('12')
  })

  it('should handle zero correctly', () => {
    expect(padNN(0)).toBe('00')
  })
})

describe('tzString', () => {
  describe('tzString', () => {
    it('should format positive offsets correctly', () => {
      expect(tzString(330)).toBe('-05:30') // 330 minutes is 5 hours and 30 minutes
    })

    it('should format negative offsets correctly', () => {
      expect(tzString(-330)).toBe('+05:30') // -330 minutes is -5 hours and -30 minutes
    })

    it('should format zero offset correctly', () => {
      expect(tzString(0)).toBe('+00:00')
    })

    it('should format offsets less than an hour correctly', () => {
      expect(tzString(45)).toBe('-00:45') // 45 minutes
    })

    it('should format offsets more than an hour correctly', () => {
      expect(tzString(-75)).toBe('+01:15') // -75 minutes is -1 hour and -15 minutes
    })
  })
})

describe('makeDayKindGetter', () => {
  let CalendarApp: any
  let holidayCalendar: any
  let originalCalendarApp: any
  const currentTzString = tzString(new Date().getTimezoneOffset())

  beforeAll(() => {
    originalCalendarApp = global.CalendarApp
  })

  afterAll(() => {
    global.CalendarApp = originalCalendarApp
  })
  beforeEach(() => {
    holidayCalendar = {
      getEventsForDay: jest.fn()
    }
    CalendarApp = {
      getCalendarById: jest.fn().mockReturnValue(holidayCalendar)
    }
    global.CalendarApp = CalendarApp
  })

  it('should return SUN for Sunday', () => {
    const date = new Date(`2023-10-01T00:00:00.000${currentTzString}`) // A Sunday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('SUN')
  })

  it('should return MON for Monday', () => {
    const date = new Date(`2023-10-02T00:00:00.000${currentTzString}`) // A Monday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('MON')
  })

  it('should return TUE for Tuesday', () => {
    const date = new Date(`2023-10-03T00:00:00.000${currentTzString}`) // A Tuesday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('TUE')
  })

  it('should return WED for Wednesday', () => {
    const date = new Date(`2023-10-04T00:00:00.000${currentTzString}`) // A Wednesday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('WED')
  })

  it('should return THU for Thursday', () => {
    const date = new Date(`2023-10-05T00:00:00.000${currentTzString}`) // A Thursday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('THU')
  })

  it('should return FRI for Friday', () => {
    const date = new Date(`2023-10-06T00:00:00.000${currentTzString}`) // A Friday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('FRI')
  })

  it('should return SAT for Saturday', () => {
    const date = new Date(`2023-10-07T00:00:00.000${currentTzString}`) // A Saturday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    expect(makeDayKindGetter()(date)).toBe('SAT')
  })

  it('should return HOL for a holiday', () => {
    const date = new Date(`2023-10-09T00:00:00.000${currentTzString}`) // A Monday
    holidayCalendar.getEventsForDay.mockReturnValue([{}]) // Mocking a holiday event
    expect(makeDayKindGetter()(date)).toBe('HOL')
  })
  it('should call getEventsForDay twice when multiple calendar IDs are provided', () => {
    const date = new Date(`2023-10-01T00:00:00.000${currentTzString}`) // A Sunday
    holidayCalendar.getEventsForDay.mockReturnValue([])
    const getDayKind = makeDayKindGetter(['cal1', 'cal2'])
    getDayKind(date)
    expect(holidayCalendar.getEventsForDay).toHaveBeenCalledTimes(2)
  })
})

describe('formatHHMMOver24Hours', () => {
  it('should format time correctly without changing the day', () => {
    const baseTime = new Date('2023-10-01T10:00:00Z')
    const result = formatHHMMOver24Hours(baseTime, 15, 30, '+00:00', 12)
    expect(result).toBe('2023-10-01T15:30:00.000+00:00')
  })

  it('should format time correctly and change the day', () => {
    const baseTime = new Date('2023-10-01T10:00:00Z')
    const result = formatHHMMOver24Hours(baseTime, 5, 30, '+00:00', 12)
    expect(result).toBe('2023-10-02T05:30:00.000+00:00')
  })

  it('should handle times over 24 hours correctly', () => {
    const baseTime = new Date('2023-10-01T10:00:00Z')
    const result = formatHHMMOver24Hours(baseTime, 25, 30, '+00:00', 12)
    expect(result).toBe('2023-10-02T01:30:00.000+00:00')
  })

  // TODO: 負の時刻の扱いは未定(時刻表だとないよね、どうする)
  // it('should handle negative time offsets correctly', () => {
  //   const baseTime = new Date('2023-10-01T10:00:00Z')
  //   const result = formatHHMMOver24Hours(baseTime, -5, 30, '+00:00', 12)
  //   expect(result).toBe('2023-10-01T19:30:00.000+00:00')
  // })

  it('should handle different time zones correctly', () => {
    const baseTime = new Date('2023-10-01T10:00:00Z')
    const result = formatHHMMOver24Hours(baseTime, 15, 30, '-05:00', 12)
    expect(result).toBe('2023-10-01T15:30:00.000-05:00')
  })

  describe('chkRecsAlreadyExist', () => {
    let client: jest.Mocked<Client>
    const currentTzString = tzString(new Date().getTimezoneOffset())

    beforeEach(() => {
      client = new (jest.fn().mockImplementation(() => ({
        queryDatabases: jest.fn()
      })) as any)()
    })

    it('should return true if records already exist', async () => {
      client.queryDatabases.mockResolvedValue({
        results: [{} as any] // Mocking a non-empty result
      } as any)

      const result = await chkRecsAlreadyExist(
        client,
        'databaseId',
        new Date(`2023-10-01T10:00:00.000${currentTzString}`),
        12,
        'propName'
      )

      expect(result).toBe(true)
      expect(client.queryDatabases).toHaveBeenCalledWith({
        database_id: 'databaseId',
        filter: {
          property: 'propName',
          date: {
            on_or_after: `2023-10-01T13:00:00.000${currentTzString}`
          }
        }
      })
    })

    it('should return false if no records exist', async () => {
      client.queryDatabases.mockResolvedValue({
        results: [] // Mocking an empty result
      } as any)

      const result = await chkRecsAlreadyExist(
        client,
        'databaseId',
        new Date(`2023-10-01T10:00:00.000${currentTzString}`),
        12,
        'propName'
      )

      expect(result).toBe(false)
      expect(client.queryDatabases).toHaveBeenCalledWith({
        database_id: 'databaseId',
        filter: {
          property: 'propName',
          date: {
            on_or_after: `2023-10-01T13:00:00.000${currentTzString}`
          }
        }
      })
    })
  })

  describe('isTimeStampIncluded', () => {
    it('should return true if @time is included', () => {
      expect(isTimeStampIncluded('This is a test @time')).toBe(true)
    })

    it('should return true if @startTime is included', () => {
      expect(isTimeStampIncluded('This is a test @startTime')).toBe(true)
    })

    it('should return true if @date is included', () => {
      expect(isTimeStampIncluded('This is a test @date')).toBe(true)
    })

    it('should return true if @startDate is included', () => {
      expect(isTimeStampIncluded('This is a test @startDate')).toBe(true)
    })

    it('should return false if no timestamp is included', () => {
      expect(isTimeStampIncluded('This is a test')).toBe(false)
    })

    it('should return false if text is empty', () => {
      expect(isTimeStampIncluded('')).toBe(false)
    })

    it('should return true if multiple timestamps are included', () => {
      expect(isTimeStampIncluded('This is a test @time and @date')).toBe(true)
    })

    it('should return true if timestamp is at the start of the text', () => {
      expect(isTimeStampIncluded('@time This is a test')).toBe(true)
    })

    it('should return true if timestamp is at the end of the text', () => {
      expect(isTimeStampIncluded('This is a test @time')).toBe(true)
    })
  })

  describe('titleParams', () => {
    it('should handle @time correctly', () => {
      const result = titleParams(
        'Event @time',
        '2023-10-01T10:00:00Z',
        '2023-10-01T11:00:00Z'
      )
      expect(result).toEqual([
        { text: { content: 'Event ' } },
        {
          mention: {
            date: {
              start: '2023-10-01T10:00:00Z',
              end: '2023-10-01T11:00:00Z'
            }
          }
        }
      ])
    })

    it('should handle @startTime correctly', () => {
      const result = titleParams(
        'Event @startTime',
        '2023-10-01T10:00:00Z',
        null
      )
      expect(result).toEqual([
        { text: { content: 'Event ' } },
        {
          mention: {
            date: {
              start: '2023-10-01T10:00:00Z'
            }
          }
        }
      ])
    })

    it('should handle @date correctly', () => {
      const result = titleParams(
        'Event @date',
        '2023-10-01T10:00:00Z',
        '2023-10-01T11:00:00Z'
      )
      expect(result).toEqual([
        { text: { content: 'Event ' } },
        {
          mention: {
            date: {
              start: '2023-10-01',
              end: '2023-10-01'
            }
          }
        }
      ])
    })

    it('should handle @startDate correctly', () => {
      const result = titleParams(
        'Event @startDate',
        '2023-10-01T10:00:00Z',
        null
      )
      expect(result).toEqual([
        { text: { content: 'Event ' } },
        {
          mention: {
            date: {
              start: '2023-10-01'
            }
          }
        }
      ])
    })

    it('should handle multiple timestamps correctly', () => {
      const result = titleParams(
        'Event @time and @date',
        '2023-10-01T10:00:00Z',
        '2023-10-01T11:00:00Z'
      )
      expect(result).toEqual([
        { text: { content: 'Event ' } },
        {
          mention: {
            date: {
              start: '2023-10-01T10:00:00Z',
              end: '2023-10-01T11:00:00Z'
            }
          }
        },
        { text: { content: ' and ' } },
        {
          mention: {
            date: {
              start: '2023-10-01',
              end: '2023-10-01'
            }
          }
        }
      ])
    })

    it('should handle text without timestamps correctly', () => {
      const result = titleParams(
        'Event without timestamps',
        '2023-10-01T10:00:00Z',
        null
      )
      expect(result).toEqual([
        { text: { content: 'Event without timestamps' } }
      ])
    })

    it('should handle empty text correctly', () => {
      const result = titleParams('', '2023-10-01T10:00:00Z', null)
      expect(result).toEqual([])
    })
  })

  describe('cleanup', () => {
    let client: jest.Mocked<Client>

    beforeEach(() => {
      client = new (jest.fn().mockImplementation(() => ({
        queryDatabases: jest.fn(),
        trashPage: jest.fn()
      })) as any)()
    })

    it('should call trashPage for each content item', async () => {
      const mockContent = [
        {
          id: 'page1',
          archived: false,
          properties: {}
        },
        {
          id: 'page2',
          archived: false,
          properties: {}
        }
      ]
      const currentTzString = tzString(new Date().getTimezoneOffset())

      client.queryDatabases.mockResolvedValue({
        results: mockContent
      } as any)

      await cleanup(
        client,
        'databaseId',
        new Date(`2023-10-01T10:00:00.000${currentTzString}`),
        30,
        'propName'
      )

      expect(client.queryDatabases).toHaveBeenCalledWith({
        database_id: 'databaseId',
        filter: {
          property: 'propName',
          date: {
            on_or_before: `2023-10-01T09:30:00.000${currentTzString}`
          }
        }
      })
      expect(client.trashPage).toHaveBeenCalledTimes(mockContent.length)
      for (const item of mockContent) {
        expect(client.trashPage).toHaveBeenCalledWith(item.id)
      }
    })

    it('should handle empty content gracefully', async () => {
      client.queryDatabases.mockResolvedValue({
        results: []
      } as any)

      await cleanup(
        client,
        'databaseId',
        new Date('2023-10-01T10:00:00Z'),
        30,
        'propName'
      )

      expect(client.trashPage).not.toHaveBeenCalled()
    })
  })
  describe('GatherTimeRecs', () => {
    let client: jest.Mocked<Client>
    let gatherTimeRecs: GatherTimeRecs

    beforeEach(() => {
      client = new (jest.fn().mockImplementation(() => ({
        queryDatabases: jest.fn(),
        trashPage: jest.fn()
      })) as any)()
      gatherTimeRecs = new GatherTimeRecs(
        client,
        'databaseId',
        new Date('2023-10-01T10:00:00Z'),
        12,
        {
          name: 'propName',
          time: 'propTime',
          tags: ['propTags1', 'propTags2']
        }
      )
    })

    describe('gather', () => {
      it('should gather time records correctly', async () => {
        const mockContent = [
          {
            id: 'page1',
            archived: false,
            properties: {
              propTime: {
                id: 'prop1',
                type: 'date',
                date: {
                  start: '2023-10-01T10:00:00Z',
                  end: '2023-10-01T11:00:00Z',
                  time_zone: null
                }
              }
            }
          },
          {
            id: 'page2',
            archived: false,
            properties: {
              propTime: {
                id: 'prop2',
                type: 'date',
                date: {
                  start: '2023-10-01T12:00:00Z',
                  end: '2023-10-01T13:00:00Z',
                  time_zone: null
                }
              }
            }
          }
        ]

        client.queryDatabases.mockResolvedValue({
          results: mockContent
        } as any)

        await gatherTimeRecs.gather()

        expect(gatherTimeRecs['recs']).toEqual([
          {
            id: 'page1',
            props: {
              propTime: {
                start: '2023-10-01T10:00:00Z',
                end: '2023-10-01T11:00:00Z',
                time_zone: ''
              }
            }
          },
          {
            id: 'page2',
            props: {
              propTime: {
                start: '2023-10-01T12:00:00Z',
                end: '2023-10-01T13:00:00Z',
                time_zone: ''
              }
            }
          }
        ])
      })

      it('should handle empty content gracefully', async () => {
        client.queryDatabases.mockResolvedValue({
          results: []
        } as any)

        await gatherTimeRecs.gather()

        expect(gatherTimeRecs['recs']).toEqual([])
      })
    })

    describe('isExist', () => {
      beforeEach(async () => {
        const mockContent = [
          {
            id: 'page1',
            archived: false,
            properties: {
              propName: {
                id: 'title',
                type: 'title',
                title: [
                  {
                    type: 'text',
                    text: {
                      content: 'Name1',
                      link: null
                    },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: 'default'
                    },
                    plain_text: 'Name1',
                    href: null
                  }
                ]
              },
              propTime: {
                id: 'prop1-time',
                type: 'date',
                date: {
                  start: '2023-10-01T10:00:00Z',
                  end: '2023-10-01T11:00:00Z',
                  time_zone: null
                }
              },
              propTags1: {
                id: 'prop1-tags1',
                type: 'multi_select',
                multi_select: [{ name: 'tag1' }]
              },
              propTags2: {
                id: 'prop1-tags2',
                type: 'multi_select',
                multi_select: [{ name: 'tag2-1' }, { name: 'tag2-2' }]
              }
            }
          },
          {
            id: 'page2',
            archived: false,
            properties: {
              propName: {
                id: 'title',
                type: 'title',
                title: [
                  {
                    type: 'text',
                    text: {
                      content: 'Name2',
                      link: null
                    },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: 'default'
                    },
                    plain_text: 'Name2',
                    href: null
                  }
                ]
              },
              propTime: {
                id: 'prop2-time',
                type: 'date',
                date: {
                  start: '2023-10-01T12:00:00Z',
                  end: '2023-10-01T13:00:00Z',
                  time_zone: null
                }
              },
              propTags1: {
                id: 'prop2-tags1',
                type: 'multi_select',
                multi_select: [{ name: 'tag1' }]
              },
              propTags2: {
                id: 'prop2-tags2',
                type: 'multi_select',
                multi_select: [{ name: 'tag2-1' }, { name: 'tag2-2' }]
              }
            }
          }
        ]

        client.queryDatabases.mockResolvedValue({
          results: mockContent
        } as any)

        await gatherTimeRecs.gather()
      })

      it('should return true if the record exists', () => {
        const result = gatherTimeRecs.isExist(
          'Name1',
          '2023-10-01T10:00:00Z',
          '2023-10-01T11:00:00Z',
          [['tag1'], ['tag2-1', 'tag2-2']]
        )
        expect(result).toBe(true)
      })

      it('should return true if the record exists with a timestamp in the name', () => {
        const result = gatherTimeRecs.isExist(
          'Name1 @time',
          '2023-10-01T10:00:00Z',
          '2023-10-01T11:00:00Z',
          [['tag1'], ['tag2-1', 'tag2-2']]
        )
        expect(result).toBe(true)
      })

      it('should return true if the record exists(name)', () => {
        const result = gatherTimeRecs.isExist(
          'Name3',
          '2023-10-01T10:00:00Z',
          '2023-10-01T11:00:00Z',
          [['tag1'], ['tag2-1', 'tag2-2']]
        )
        expect(result).toBe(false)
      })

      it('should return false if the record does not exist(tags)', () => {
        const result = gatherTimeRecs.isExist(
          'Name1',
          '2023-10-01T14:00:00Z',
          '2023-10-01T15:00:00Z',
          [['tag1'], ['tag2']]
        )
        expect(result).toBe(false)
      })
    })
  })
})

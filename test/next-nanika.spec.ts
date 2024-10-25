import { jest } from '@jest/globals'
import { NextNanika } from '../src/next-nanika.js'
import { Client } from '../src/client.js'
import { tzString } from '../src/util.js'

describe('NextNanika.makeClient()', () => {
  const client = NextNanika.makeClient({ auth: 'test-auth' })
  expect(client).toBeInstanceOf(Client)
})

describe('NextNanika.run()', () => {
  let mockClient: jest.Mocked<Client>
  let mockTimeRecGenerator: NextNanika.TimeRecGenerator
  let spy: jest.Spied<DateConstructor>
  const currentTzString = tzString(new Date().getTimezoneOffset())

  beforeAll(() => {
    const mockDate = new Date(`2023-10-01T09:00:00.000${currentTzString}`)
    const saveDate = Date
    spy = jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (typeof args[0] === 'undefined') {
        return mockDate
      }
      return new saveDate(...args)
    })
  })
  afterAll(() => {
    spy.mockRestore()
  })

  beforeEach(() => {
    mockClient = {
      queryDatabases: jest.fn(),
      createPage: jest.fn(),
      trashPage: jest.fn()
    } as unknown as jest.Mocked<Client>

    mockTimeRecGenerator = function* () {
      yield {
        start: { hh: 9, mm: 0 },
        end: { hh: 10, mm: 0 },
        name: 'Test Event',
        tags: [[], ['test']],
        icon: '📅'
      }
    }
  })

  it('should gather and create pages correctly', async () => {
    const opts: NextNanika.NextNanikaOptions = {
      databaseId: 'test-database-id',
      timeRecGenerator: mockTimeRecGenerator,
      propNames: {
        name: 'Name',
        time: 'Time',
        tags: ['group', 'tags']
      },
      getDatKind: (date: Date) => {
        return 'SUN'
      }
    }
    mockClient.queryDatabases.mockResolvedValueOnce({
      results: [
        {
          id: 'page1',
          archived: false,
          properties: {
            Time: {
              type: 'date',
              date: {
                start: `2023-09-30T09:00:00.000${currentTzString}`,
                end: `2023-09-30T10:00:00.000${currentTzString}`,
                time_zone: null
              }
            }
          }
        }
      ]
    } as any)
    mockClient.queryDatabases.mockResolvedValueOnce({
      results: [
        {
          id: 'page1',
          archived: false,
          properties: {
            Name: {
              id: 'title',
              type: 'title',
              title: [
                {
                  type: 'text',
                  text: {
                    content: 'Test Event',
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
                  plain_text: 'Test Event',
                  href: null
                }
              ]
            },
            Time: {
              type: 'date',
              date: {
                start: `2023-10-01T09:00:00.000${currentTzString}`,
                end: `2023-10-01T10:00:00.000${currentTzString}`,
                time_zone: null
              }
            },
            group: {
              type: 'multi_select',
              multi_select: []
            },
            tags: {
              type: 'multi_select',
              multi_select: [
                {
                  id: 'test',
                  name: 'test',
                  color: 'default'
                }
              ]
            }
          }
        }
      ]
    } as any)

    await NextNanika.run(mockClient, opts)

    expect(mockClient.queryDatabases).toHaveBeenCalledTimes(2) // 存在しいてるページの取得と cleanup で 2 回
    expect(mockClient.createPage).toHaveBeenCalledTimes(2) // 既に存在しているページがあるので１回少ない
    expect(mockClient.trashPage).toHaveBeenCalledTimes(1)
    expect(mockClient.queryDatabases).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        database_id: 'test-database-id',
        filter: {
          property: 'Time',
          date: { on_or_before: `2023-09-30T09:00:00.000${currentTzString}` }
        }
      })
    )
    expect(mockClient.createPage).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { database_id: 'test-database-id' },
        properties: expect.objectContaining({
          Name: expect.any(Object),
          Time: expect.any(Object),
          group: expect.any(Object),
          tags: expect.any(Object)
        }),
        icon: { type: 'emoji', emoji: '📅' }
      })
    )
    expect(mockClient.queryDatabases).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        database_id: 'test-database-id',
        filter: {
          property: 'Time',
          date: { on_or_after: `2023-10-01T03:00:00.000${currentTzString}` }
        }
      })
    )
  })

  it('should handle multiple time record generators correctly', async () => {
    const mockTimeRecGenerator1: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 9, mm: 0 },
        end: { hh: 10, mm: 0 },
        name: 'Event 1',
        tags: [[], ['tag1']],
        icon: '📅'
      }
    }

    const mockTimeRecGenerator2: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 11, mm: 0 },
        end: { hh: 12, mm: 0 },
        name: 'Event 2',
        tags: [[], ['tag2']],
        icon: '📅'
      }
    }

    const opts: NextNanika.NextNanikaOptions = {
      databaseId: 'test-database-id',
      timeRecGenerator: [mockTimeRecGenerator1, mockTimeRecGenerator2],
      propNames: {
        name: 'Name',
        time: 'Time',
        tags: ['group', 'tags']
      },
      getDatKind: (date: Date) => {
        return 'SUN'
      }
    }

    mockClient.queryDatabases.mockResolvedValue({
      results: []
    } as any)

    await NextNanika.run(mockClient, opts)

    expect(mockClient.queryDatabases).toHaveBeenCalledTimes(2)
    expect(mockClient.createPage).toHaveBeenCalledTimes(6) // 2 generators * 3 days
    expect(mockClient.createPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parent: { database_id: 'test-database-id' },
        properties: expect.objectContaining({
          Name: expect.objectContaining({
            title: expect.arrayContaining([
              expect.objectContaining({
                text: expect.objectContaining({
                  content: 'Event 1'
                })
              })
            ])
          }),
          Time: expect.objectContaining({
            date: expect.objectContaining({
              start: `2023-10-01T09:00:00.000${currentTzString}`,
              end: `2023-10-01T10:00:00.000${currentTzString}`
            })
          }),
          tags: expect.objectContaining({
            multi_select: expect.arrayContaining([
              expect.objectContaining({
                name: 'tag1'
              })
            ])
          })
        }),
        icon: { type: 'emoji', emoji: '📅' }
      })
    )
  })

  it('should respect the limit option and create only the specified number of pages', async () => {
    const mockTimeRecGenerator1: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 9, mm: 0 },
        end: { hh: 10, mm: 0 },
        name: 'Event 1',
        tags: [[], ['tag1']],
        icon: '📅'
      }
    }

    const mockTimeRecGenerator2: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 11, mm: 0 },
        end: { hh: 12, mm: 0 },
        name: 'Event 2',
        tags: [[], ['tag2']],
        icon: '📅'
      }
    }

    const opts: NextNanika.NextNanikaOptions = {
      databaseId: 'test-database-id',
      timeRecGenerator: [mockTimeRecGenerator1, mockTimeRecGenerator2],
      propNames: {
        name: 'Name',
        time: 'Time',
        tags: ['group', 'tags']
      },
      getDatKind: (date: Date) => {
        return 'SUN'
      },
      limit: 2 // 5 などではなく 2 を指定している理由。対象の期間(3日)、generatorの数(2) に対して、すべてのループを抜けているか確認するため.
    }

    mockClient.queryDatabases.mockResolvedValue({
      results: []
    } as any)

    await NextNanika.run(mockClient, opts)

    expect(mockClient.queryDatabases).toHaveBeenCalledTimes(2)
    expect(mockClient.createPage).toHaveBeenCalledTimes(2) // Should create only 2 pages due to the limit
  })

  it('should process only the specified number of days', async () => {
    const mockTimeRecGenerator1: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 9, mm: 0 },
        end: { hh: 10, mm: 0 },
        name: 'Event 1',
        tags: [[], ['tag1']],
        icon: '📅'
      }
    }

    const mockTimeRecGenerator2: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 11, mm: 0 },
        end: { hh: 12, mm: 0 },
        name: 'Event 2',
        tags: [[], ['tag2']],
        icon: '📅'
      }
    }

    const opts: NextNanika.NextNanikaOptions = {
      databaseId: 'test-database-id',
      timeRecGenerator: [mockTimeRecGenerator1, mockTimeRecGenerator2],
      propNames: {
        name: 'Name',
        time: 'Time',
        tags: ['group', 'tags']
      },
      getDatKind: (date: Date) => {
        return 'SUN'
      },
      daysToProcess: 2
    }

    mockClient.queryDatabases.mockResolvedValue({
      results: []
    } as any)

    await NextNanika.run(mockClient, opts)

    expect(mockClient.queryDatabases).toHaveBeenCalledTimes(2)
    expect(mockClient.createPage).toHaveBeenCalledTimes(4) // 2 generators * 2 days
    expect(mockClient.createPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parent: { database_id: 'test-database-id' },
        properties: expect.objectContaining({
          Name: expect.objectContaining({
            title: expect.arrayContaining([
              expect.objectContaining({
                text: expect.objectContaining({
                  content: 'Event 1'
                })
              })
            ])
          }),
          Time: expect.objectContaining({
            date: expect.objectContaining({
              start: `2023-10-01T09:00:00.000${currentTzString}`,
              end: `2023-10-01T10:00:00.000${currentTzString}`
            })
          }),
          tags: expect.objectContaining({
            multi_select: expect.arrayContaining([
              expect.objectContaining({
                name: 'tag1'
              })
            ])
          })
        }),
        icon: { type: 'emoji', emoji: '📅' }
      })
    )
  })
  it('should skip cleanup when skipCleanup is true', async () => {
    const mockTimeRecGenerator: NextNanika.TimeRecGenerator = function* () {
      yield {
        start: { hh: 9, mm: 0 },
        end: { hh: 10, mm: 0 },
        name: 'Event 1',
        tags: [[], ['tag1']],
        icon: '📅'
      }
    }

    const opts: NextNanika.NextNanikaOptions = {
      databaseId: 'test-database-id',
      timeRecGenerator: mockTimeRecGenerator,
      propNames: {
        name: 'Name',
        time: 'Time',
        tags: ['group', 'tags']
      },
      getDatKind: (date: Date) => {
        return 'SUN'
      },
      skipCleanup: true
    }

    mockClient.queryDatabases.mockResolvedValue({
      results: []
    } as any)

    await NextNanika.run(mockClient, opts)

    expect(mockClient.queryDatabases).toHaveBeenCalledTimes(1) // Only for gathering, not for cleanup
    expect(mockClient.createPage).toHaveBeenCalledTimes(3) // 1 generator * 3 days
    expect(mockClient.trashPage).not.toHaveBeenCalled() // No cleanup, so no trashing
    expect(mockClient.createPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parent: { database_id: 'test-database-id' },
        properties: expect.objectContaining({
          Name: expect.objectContaining({
            title: expect.arrayContaining([
              expect.objectContaining({
                text: expect.objectContaining({
                  content: 'Event 1'
                })
              })
            ])
          }),
          Time: expect.objectContaining({
            date: expect.objectContaining({
              start: `2023-10-01T09:00:00.000${currentTzString}`,
              end: `2023-10-01T10:00:00.000${currentTzString}`
            })
          }),
          tags: expect.objectContaining({
            multi_select: expect.arrayContaining([
              expect.objectContaining({
                name: 'tag1'
              })
            ])
          })
        }),
        icon: { type: 'emoji', emoji: '📅' }
      })
    )
  })
})

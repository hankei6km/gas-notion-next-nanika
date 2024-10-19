import type { Client as NotionClient } from '@notionhq/client'
import type { NextNanika } from './next-nanika.js'

const apiVersion = '2022-02-22'
const apiUrlDabtabaseQuery = (database_id: string) =>
  `https://api.notion.com/v1/databases/${database_id}/query`
const startCursorRegExp = new RegExp(/^[\da-f\-]+$/)
const apiUrlBlockChildren = (
  database_id: string,
  start_cursor?: string,
  page_size?: number
) => {
  const params: string[] = []
  // ドキュメントだとUUIDv4だがハイフンなしも許容されるようなので厳密な判定ではない
  if (start_cursor && startCursorRegExp.test(start_cursor)) {
    params.push(`start_cursor=${start_cursor}`)
  }
  if (typeof page_size === 'number' && page_size > 0) {
    params.push(`page_size=${page_size}`)
  }
  if (params.length > 0) {
    return `https://api.notion.com/v1/blocks/${database_id}/children?${params.join(
      '&'
    )}`
  }
  return `https://api.notion.com/v1/blocks/${database_id}/children`
}

export function isErrRes(
  res: GoogleAppsScript.URL_Fetch.HTTPResponse
): boolean {
  const code = Math.trunc(res.getResponseCode() / 100)
  if (code === 4 || code === 5) {
    return true
  }
  return false
}

export class Client implements NextNanika.BaseClient {
  private auth: string = ''

  constructor(options: NextNanika.ClientOpts) {
    this.auth = options.auth
  }

  queryDatabases(
    ...args: Parameters<NotionClient['databases']['query']>
  ): ReturnType<NotionClient['databases']['query']> {
    const url = apiUrlDabtabaseQuery(args[0].database_id)
    const { database_id, ...payload } = args[0]
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.auth}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    })
    if (isErrRes(res)) {
      return Promise.reject(
        new Error(
          `queryDatabases ${res.getResponseCode()}, text: ${res.getContentText()}`
        )
      )
    }
    const resQuery = JSON.parse(res.getContentText()) as Awaited<
      ReturnType<NotionClient['databases']['query']>
    >
    return Promise.resolve(resQuery)
  }
  listBlockChildren(
    ...args: Parameters<NotionClient['blocks']['children']['list']>
  ): ReturnType<NotionClient['blocks']['children']['list']> {
    const url = apiUrlBlockChildren(
      args[0].block_id,
      args[0].start_cursor,
      args[0].page_size
    )
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${this.auth}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      muteHttpExceptions: true
    })
    if (isErrRes(res)) {
      return Promise.reject(
        new Error(
          `listBlockChildren ${res.getResponseCode()}, text: ${res.getContentText()}`
        )
      )
    }
    const resQuery = JSON.parse(res.getContentText()) as Awaited<
      ReturnType<NotionClient['blocks']['children']['list']>
    >
    return Promise.resolve(resQuery)
  }
  createPage(
    ...args: Parameters<NotionClient['pages']['create']>
  ): ReturnType<NotionClient['pages']['create']> {
    const res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.auth}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      payload: JSON.stringify(args[0]),
      muteHttpExceptions: true
    })
    if (isErrRes(res)) {
      return Promise.reject(
        new Error(
          `createPage ${res.getResponseCode()}, text: ${res.getContentText()}`
        )
      )
    }
    const resQuery = JSON.parse(res.getContentText()) as Awaited<
      ReturnType<NotionClient['pages']['create']>
    >
    return Promise.resolve(resQuery)
  }
  trashPage(
    pageId: string
  ): Promise<Awaited<ReturnType<NotionClient['pages']['update']>>> {
    const res = UrlFetchApp.fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'patch',
      headers: {
        Authorization: `Bearer ${this.auth}`,
        'Content-Type': 'application/json',
        'Notion-Version': apiVersion
      },
      payload: JSON.stringify({ archived: true }),
      muteHttpExceptions: true
    })
    if (isErrRes(res)) {
      return Promise.reject(
        new Error(
          `trashPage ${res.getResponseCode()}, text: ${res.getContentText()}`
        )
      )
    }
    const resQuery = JSON.parse(res.getContentText()) as Awaited<
      ReturnType<NotionClient['pages']['update']>
    >
    return Promise.resolve(resQuery)
  }
}

export function makeClient(opts: NextNanika.ClientOpts): NextNanika.BaseClient {
  return new Client(opts)
}

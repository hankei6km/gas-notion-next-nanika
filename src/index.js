/**
 * gas-notion-next-nanika
 * @copyright (c) 2024 hankei6km
 * @license MIT
 * see "LICENSE.txt" "OPEN_SOURCE_LICENSES.txt" of "gas-notion-next-nanika.zip" in
 * releases(https://github.com/hankei6km/gas-notion-next-nanika/releases)
 */

'use strict'

function makeClient(opts) {
  return _entry_point_.NextNanika.makeClient(opts)
}

function makeDayKindGetter(calendarId) {
  return _entry_point_.NextNanika.makeDayKindGetter(calendarId)
}

async function cleanup(client, databaseId, minutesAgo, propName) {
  return _entry_point_.NextNanika.cleanup(
    client,
    databaseId,
    minutesAgo,
    propName
  )
}

async function run(client, opts) {
  return _entry_point_.NextNanika.run(client, opts)
}

function makeBasicTimeRecGenerator(timeTable, group) {
  return _entry_point_.NextNanika.makeBasicTimeRecGenerator(timeTable, group)
}

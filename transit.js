const client = require('cheerio-httpcli')
const BASE_URL = 'https://transit.yahoo.co.jp'

/**
 * 始発駅と到着駅を指定すると、
 * 現在駅から直近のルートに関する情報をYahoo路線から収集する
 */
exports.fetchTransitInfo = (stationFrom, stationTo) => {
  return client.fetch(BASE_URL)
    .then((result) => {
      result.$('#sfrom').val(stationFrom)
      result.$('#sto').val(stationTo)
      return result.$('#searchModuleSubmit').click()
    })
    .then((result) => {
      return parseTransitInfo(result)
    })
}

/**
 * Yahoo路線ページのURLを指定すると
 * そのページの１本後の路線に関する情報を収集する
 */
exports.fetchNextTransitInfo = (currentUrl) => {
  return client.fetch(currentUrl)
    .then((result) => {
      const nextUrl = result.$('.next a').first().attr('href')
      return client.fetch(BASE_URL + nextUrl)
    })
    .then((result) => {
      return parseTransitInfo(result)
    })
}

/**
 * Yahoo路線のページリザルトから、先頭の路線情報を抜き出す
 */
const parseTransitInfo = (page) => {
  const $routeDetail = page.$('.routeDetail').first()
  const distance     = page.$('.distance').first().text()
  const fare         = page.$('.fare').first().text()
  const transfer     = Number(page.$('.transfer').first().text().match(/\d/)[0])
  const transport = $routeDetail.find('.transport')
                    .text()
                    .split(/\r\n|\r|\n/)
                    .filter((line) => line.indexOf('[train]') >= 0 || line.indexOf('[bus]') >= 0)[0]
                    .split(/\[.+\]/)[1];
  const startTime = $routeDetail.find('.time li').first().text()
  const arrivalTime = $routeDetail.find('.time li').last().text()
  const url = page.response.request.uri.href
  return {
    distance,
    fare,
    transfer,
    startTime,
    arrivalTime,
    transport,
    url
  }
}

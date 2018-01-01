const Alexa   = require('alexa-sdk');
const transit = require('./transit.js')

exports.handler = function(event, context, callback) {
  const alexa = Alexa.handler(event, context);
  alexa.registerHandlers(firstHandlers, secondHandlers);
  alexa.execute();
};

/**
 * 路線情報に関するメッセージを生成する
 * @param [String] stationFrom 出発地
 * @param [String] stationTo   到着地
 * @param [Object] transitInfo 路線情報オブジェクト
 */
const makeTransitMessage = (stationFrom, stationTo, transitInfo) => {
  const msg = `
    ${transitInfo.startTime}に${stationFrom}に到着する、
    ${transitInfo.transport}に乗車すると、${transitInfo.arrivalTime}に
    ${stationTo}に到着します。
    運賃は${transitInfo.fare}で、${transitInfo.transfer}回の乗り換えがあります。
  `
  return msg.replace('行に', '行きに')
            .replace('0回の乗り換えがあります。', '乗り換えはありません。')
}

/**
 * 初回のハンドラ
 */
const firstHandlers = {
    'LaunchRequest': function () {
      this.emit('Transit');
    },
    'Transit': function () {
      const stationFrom = this.event.request.intent.slots.StationFrom.value
      const stationTo   = this.event.request.intent.slots.StationTo.value
      transit.fetchTransitInfo(stationFrom, stationTo).then((result) => {
        const transitMessage = makeTransitMessage(stationFrom, stationTo, result)
        this.attributes['stationFrom']    = stationFrom
        this.attributes['stationTo']      = stationTo
        this.attributes['transitMessage'] = transitMessage
        this.attributes['currentUrl']     = result.url
        this.handler.state = 'SECOND';
        this.emit(':ask', transitMessage)
      })
    },
    'AMAZON.HelpIntent': function () {},
    'AMAZON.CancelIntent': function () {},
    'AMAZON.StopIntent': function () {}
};

/**
 * 初回以降のハンドラ
 */
const secondHandlers = Alexa.CreateStateHandler('SECOND', {

  // 保持している路線情報をリピート
  'Repeat': function() {
    this.emit(':ask', this.attributes['transitMessage'])
  },

  // １本後の路線情報を発話
  'Next': function() {
    transit.fetchAdjacentTransitInfo(this.attributes['currentUrl'], 'next').then((result) => {
      const transitMessage = makeTransitMessage(
        this.attributes['stationFrom'],
        this.attributes['stationTo'],
        result
      )
      this.attributes['transitMessage'] = transitMessage
      this.attributes['currentUrl'] = result.url
      this.emit(':ask', transitMessage)
    })
  },

  // １本前の路線情報を発話
  'Prev': function() {
    transit.fetchAdjacentTransitInfo(this.attributes['currentUrl'], 'prev').then((result) => {
      const transitMessage = makeTransitMessage(
        this.attributes['stationFrom'],
        this.attributes['stationTo'],
        result
      )
      this.attributes['transitMessage'] = transitMessage
      this.attributes['currentUrl'] = result.url
      this.emit(':ask', transitMessage)
    })
  },

  // セッション終了
  'Complete': function() {
    this.emit(':tell', 'いってらっしゃいませ')
  },
})

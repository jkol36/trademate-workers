import xmlparser from 'xml2js'
import request from 'superagent'
import { bookmakerLookup, SENDGRID_API_KEY } from './config'
import nodemailer from 'nodemailer'
import sgTransport from 'nodemailer-sendgrid-transport'
import moment from 'moment'
// import FCM from 'fcm-push'

// const fcm = new FCM(process.env.PUSH_SERVER_KEY)

export const mailer = nodemailer.createTransport(sgTransport({
  auth: {
    api_key: SENDGRID_API_KEY
  }
}))

export const xmlToJson = (xml) => {
  return new Promise((resolve, reject) => {
    const parser = new xmlparser.Parser()
    parser.parseString(xml, (err, data) => {
      if (!!err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export const ODDSTYPES = {
  threeway: 0,
  moneyline: 1,
  points: 3,
  totals: 4,
  ahc: 5,
  totalsht: 65540,
  threewayht: 65536,
  dnb: 6291457,
  totalcorners: 9437188,
  totalcornersht: 9502724,
  ehc: 8388608
}

export const SPORTS = {
  soccer: 1,
  basket: 3,
  rugby: 4,
  tennis: 5,
  americanfootball: 6,
  baseball: 7,
  handball: 8
}

export const STATUS = {
  open: 1,
  won: 2,
  lost: 3,
  void: 4,
  halfwon: 5,
  halflost: 6
}

const SPORTBALLS = {
  [SPORTS.soccer]: '⚽',
  [SPORTS.basket]: '🏀',
  [SPORTS.rugby]: '🏉',
  [SPORTS.tennis]: '🎾',
  [SPORTS.baseball]: '⚾',
  [SPORTS.handball]: '🖐',
  [SPORTS.americanfootball]: '🏈'
}


export const sendEmailNotification = (uid, to, trade) => {
  return new Promise((resolve, reject) => {
    let email = {
      to,
      from: 'Trademate Notifier <goodnews@tradematesports.com>',
      subject: `New trade`,
      html: `${trade.edge}% on ${bookmakerLookup[trade.bookmaker]} ${SPORTBALLS[trade.sportId]}<br />${trade.homeTeam} vs ${trade.awayTeam}<br />Starts: ${moment(trade.startTime).fromNow()}<br />Odds type: ${displayOddsType(trade.oddsType, trade.output, trade.oddsTypeCondition, trade.homeTeam, trade.awayTeam)}<br />Odds: ${trade.odds}`
    }
    mailer.sendMail(email, (err, info) => {
      if (!err) {
        resolve({
          uid,
          email: to,
          trade
        })
      } else {
        reject(err)
      }
    })
  })
}

// export const sendPushToTopic = (topic, matchIds, body) => {
//   return new Promise((resolve, reject) => {
//     request.post('https://fcm.googleapis.com/fcm/send')
//       .set('Authorization', `key=${process.env.PUSH_SERVER_KEY}`)
//       .send({
//         to: `/topics/${topic}`,
//         priority: 'high',
//         notification: {
//           title: 'Trademate Sports',
//           body
//         }
//       }).end((err, res) => {
//         if (err) {
//           reject(err)
//         } else {
//           resolve({
//             topic,
//             matchIds
//           })
//         }
//       })
//   })
// }

// export const sendPushNotification = (user, token, pushes) => {
//   return new Promise((resolve, reject) => {
//     const message = {
//       to: token,
//       data: {
//         single: pushes.length === 1
//       },
//       priority: 'high',
//       notification: {
//         title: 'Trademate Sports',
//         body: pushes.length > 1 ? `There are ${pushes.length} trades available, check out the tradefeed and get in on the action!` : `There's a new trade on ${pushes[0].homeTeam} vs ${pushes[0].awayTeam}, make sure to register the trade!`
//       }
//     }
//     fcm.send(message, (err, response) => {
//       if (err) {
//         reject(err)
//       } else {
//         resolve({
//           user,
//           token,
//           matchIds: pushes.map(p => p.matchId)
//         })
//       }
//     })
//   })
// }


export const calculateStatus = (bet, score) => {
  switch(bet.oddsType) {
    case ODDSTYPES.threeway:
      switch(bet.output) {
        case 'o1': return score[0] > score[1] ? STATUS.won : STATUS.lost
        case 'o2': return score[0] === score[1] ? STATUS.won : STATUS.lost
        case 'o3': return score[0] < score[1] ? STATUS.won : STATUS.lost
        default:
          throw new Error('Cant calculate oddstype threeway odds')
      }
    case ODDSTYPES.moneyline:
    case ODDSTYPES.dnb:
    case ODDSTYPES.ahc:
    case ODDSTYPES.points:
      if (bet.oddsTypeCondition % 0.25 === 0 && bet.oddsTypeCondition % 0.5 !== 0) {
        let status = [
          calculateStatus({
            ...bet,
            oddsTypeCondition: bet.oddsTypeCondition + 0.25
          }, score),
          calculateStatus({
            ...bet,
            oddsTypeCondition: bet.oddsTypeCondition - 0.25
          }, score)
        ]
        if (status[0] === status[1]) return status[0]
        return status[0] + status[1] - 1
      }
      score = [score[0] + (bet.oddsTypeCondition || 0), score[1]]
      if (score[0] === score[1]) return STATUS.void
      switch(bet.output) {
        case 'o1':
          return score[0] > score[1] ? STATUS.won : STATUS.lost
        case 'o2':
          return score[1] > score[0] ? STATUS.won : STATUS.lost
        default:
          throw new Error('Cant calculate status')
      }
    case ODDSTYPES.totals:
      if (bet.oddsTypeCondition % 0.25 === 0 && bet.oddsTypeCondition % 0.5 !== 0) {
        let status = [
          calculateStatus({
            ...bet,
            oddsTypeCondition: bet.oddsTypeCondition + 0.25
          }, score),
          calculateStatus({
            ...bet,
            oddsTypeCondition: bet.oddsTypeCondition - 0.25
          }, score)
        ]
        if (status[0] === status[1]) return status[0]
        return status[0] + status[1] - 1
      }
      var sumScore = score[0] + score[1]
      if (sumScore === bet.oddsTypeCondition)
        return STATUS.void
      if (bet.output === 'o1')
        return sumScore > bet.oddsTypeCondition ? STATUS.won : STATUS.lost
      return sumScore < bet.oddsTypeCondition ? STATUS.won : STATUS.lost
    case ODDSTYPES.ehc:
      score = [score[0] + bet.oddsTypeCondition, score[1]]
      switch(bet.output) {
        case 'o1':
          return score[0] > score[1] ? STATUS.won : STATUS.lost
        case 'o3':
          return score[1] > score[0] ? STATUS.won : STATUS.lost
        case 'o2':
          return score[0] === score[1] ? STATUS.won : STATUS.lost
        default:
          throw new Error('Cant calculate status')
      }
  }
}

export const displayOddsType = (id, output, condition, homeTeam, awayTeam) => {
  switch (id) {
    case ODDSTYPES.threeway:
      if (output === 'o1') return `1x2 (${homeTeam})`
      else if (output === 'o2') return '1x2 (Draw)'
      return `1x2 (${awayTeam})`
    case ODDSTYPES.totals:
      if (output === 'o1') return 'Over ' + condition.toFixed(2)
      return 'Under ' + condition.toFixed(2)
    case ODDSTYPES.moneyline:
      if (output === 'o1') return `${homeTeam} to win`
      return `${awayTeam} to win`
    case ODDSTYPES.dnb:
      if (output === 'o1') return `Draw no bet (${homeTeam})`
      return `Draw no bet (${awayTeam})`
    case ODDSTYPES.ahc:
      if (output === 'o1') {
        if (condition < 0) return 'Asian hcp ' + condition.toFixed(2) + ` (${homeTeam})`
        return 'Asian hcp +' + condition.toFixed(2) + ` (${homeTeam})`
      }
      if (condition < 0) return 'Asian hcp +' + condition.toFixed(2) * -1 + ` (${awayTeam})`
      return 'Asian hcp ' + condition.toFixed(2) * -1 + ` (${awayTeam})`
    case ODDSTYPES.points:
      if (output === 'o1') {
        if (condition < 0) return 'Handicap ' + condition.toFixed(2) + ` (${homeTeam})`
        return 'Handicap +' + condition.toFixed(2) + ` (${homeTeam})`
      }
      if (condition < 0) return 'Handicap +' + condition.toFixed(2) * -1 + ` (${awayTeam})`
      return 'Handicap ' + condition.toFixed(2) * -1 + ` (${awayTeam})`
    case ODDSTYPES.ehc:
      let resultString = ''
      if (condition >= 0) {
        resultString = '(' + condition + '-0)'
      } else {
        resultString = '(0' + condition + ')'
      }
      if (output === 'o1')
        return 'Euro hcp ' + resultString + ` (${homeTeam})`
      else return 'Euro hcp ' + resultString + ` (${awayTeam})`
    default:
      return 'N/A'
  }
}

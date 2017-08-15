import firebase from 'firebase'
import fetch from 'node-fetch'
import { xmlToJson, ODDSTYPES, SPORTS, calculateStatus } from './helpers'

const getOpenUserbets = () => {
  return new Promise((resolve, reject) => {
    firebase.database().ref('usertrades').orderByChild('status').equalTo(1).once('value')
      .then((snap) => {
        if (!snap.exists()) {
          resolve({})
        } else {
          let bets = {}
          let timeNow = Date.now()
          snap.forEach((s) => {
            let bet = s.val()
            if (timeNow - bet.match.startTime > 1000 * 60 * 90) {
              bets[s.key] = bet
            }
          })
          resolve(bets)
        }
      }).catch(reject)
  })
}

function getResultKey(sport, oddsType) {
  switch(sport) {
    case SPORTS.soccer:
      if (oddsType !== ODDSTYPES.moneyline)
        return 'FT'
      return 'CURRENT'
    case SPORTS.baseball:
      return 'R'
    case SPORTS.tennis:
    case SPORTS.basket:
    case SPORTS.rugby:
    case SPORTS.americanfootball:
      return 'CURRENT'
    case SPORTS.handball:
      return 'FT'
    default:
      return null
  }
}

export function getUserbetStatuses(bets, results) {
  // 2: Won, 3: Lost, 4: Void, 5: Half Won, 6: Half lost
  let output = {}
  for (let bet in bets) {
    let result = results[bets[bet].match._id]
    if (!!result) {
      let status = processBet(bets[bet], result)
      if (!!status) {
        output[`${bet}/status`] = status
        output[`${bet}/result`] = result[getResultKey(bets[bet].sport, bets[bet].oddsType)].join('-')
      }
    }
  }
  return output
}

export function processBet(bet, result) {
  let score
  if (bet.sport === SPORTS.tennis) {
    if (bet.oddsType === ODDSTYPES.totals) {
      score = [result['TENNIS_GAMES']]
    } else if (bet.oddsType === ODDSTYPES.points) {
      score = result['TENNIS_GAMES']
    } else {
      score = result[getResultKey(bet.sport, bet.oddsType)]
    }
  } else {
    score = result[getResultKey(bet.sport, bet.oddsType)]
  }
  if (!score) {
    return null
  }
  return calculateStatus(bet, score)
}

const parseResults = (data) => {
  let results = {}
  if (!!data.matches.match) {
    data.matches.match.forEach(match => {
      let result = {'TENNIS_GAMES': [0,0]}
      if (!!match.results[0].result) {
        if (match.results[0].status[0]['_'] !== 'Fin')
          return
        match.results[0].result.forEach(res => {
          result[res['$'].name] = res['$'].value.split('-').map(elem => +elem)
        })
      } else return
      if (!!match.results[0].periods && !!match.results[0].periods[0].period) {
        match.results[0].periods[0].period.forEach(period => {
          if (!period.detail)
            return
          let value = period.detail[0]['$'].value
          if (value.length > 0) {
            let scores = value.split('-').map(k => +k)
            result.TENNIS_GAMES[0] += scores[0]
            result.TENNIS_GAMES[1] += scores[1]
          }
        })
      }
      results[match['$'].id] = result
    })
  }
  return results
}

const getResultForMatches = (matches) => {
  return new Promise((resolve, reject) => {
    fetch(`http://xml2.txodds.com/feed/result/xml.php?ident=gjelstabet&passwd=8678y7u7&results=0&peid=${matches.join(',')}`)
      .then(res => res.text())
      .then(xmlToJson)
      .then(json => parseResults(json))
      .then((results) => {
        resolve(results)
      }).catch(reject)
    })
}

export const updateResultsWithInterval = (interval) => {
  let userbets = {}
  getOpenUserbets()
    .then((bets) => {
      let matches = [...new Set(Object.keys(bets).map(k => bets[k].match._id))]
      userbets = bets
      if (matches.length < 0)
        return Promise.resolve()
      return getResultForMatches(matches)
    }).then((results) => {
      if (Object.keys(results).length > 0) {
        let updates = getUserbetStatuses(userbets, results)
        if (Object.keys(updates).length > 0) {
          firebase.database().ref('usertrades').update(updates)
        }
      }
      return firebase.database().ref('workers-update').set({
        lastRun: firebase.database.ServerValue.TIMESTAMP,
        nResults: Object.keys(results).length
      })
    }).catch(console.log)
    .finally(() => setTimeout(() => updateResultsWithInterval(interval), interval))
}

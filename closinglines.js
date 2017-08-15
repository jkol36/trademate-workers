import { ODDSTYPES } from './config'
import firebase from 'firebase'
import mongoose from 'mongoose'

export const updateClosingLines = (interval) => {
  const now = Date.now()
  const matches = {}
  firebase.database().ref('usertrades').orderByChild('match/startTime').startAt(now - 1000 * 60 * 10).endAt(now + 1000 * 60 * 10).once('value')
    .then(snap => {
      const trades = {}
      snap.forEach(s => {
        const bet = s.val()
        const data = matches[bet.match._id] || []
        data.push({ ...bet, key: s.key })
        matches[bet.match._id] = data
      })
      return mongoose.model('Offer').find({ match: { $in: Object.keys(matches).map(k => +k) }, bookmaker: 83 }).select({odds: {$slice: -1}}).lean()
    }).then(results => {
      const updates = {}
      results.forEach(offer => {
        offer.odds = offer.odds[0]
        const bets = findBetsToMatch(offer, matches[offer.match])
        bets.forEach(b => {
          const newEdge = calculateEdge(b, offer)
          updates[`${b.key}/closing`] = newEdge
        })
      })
      return firebase.database().ref('usertrades').update(updates)
    }).then(() => {
      setTimeout(() => updateClosingLines(interval), interval)
    }).catch((err) => {
      console.log(err.stack)
      setTimeout(() => updateClosingLines(interval), interval)
    })
}


const findBetsToMatch = (offer, bets) => {
  switch(offer.oddsType) {
    case ODDSTYPES.threeway:
    case ODDSTYPES.moneyline:
      return bets.filter(b => b.oddsType === offer.oddsType)
    case ODDSTYPES.points:
    case ODDSTYPES.totals:
      return bets.filter(b => b.oddsType === offer.oddsType && offer.odds.o3 === b.oddsTypeCondition)
    case ODDSTYPES.ahc:
      var o3 = offer.odds.o3
      return bets.filter(b => (b.oddsType === ODDSTYPES.ahc && b.oddsTypeCondition === o3) ||
                (b.oddsType === ODDSTYPES.ehc && ((b.output === "o1" && b.oddsTypeCondition === o3 + 0.5) ||
                                                  (b.output === "o3" && b.oddsTypeCondition === o3 - 0.5))) ||
                (b.oddsType === ODDSTYPES.dnb && o3 === 0)
                )
    default:
      return []
  }
}

const calculateEdge = (bet, offer) => {
  switch(bet.oddsType) {
    case ODDSTYPES.threeway:
      var odds = offer.odds[bet.output]
      var baseline = odds / (1 / (1 / offer.odds.o1 + 1 / offer.odds.o2 + 1 / offer.odds.o3))
      break
    case ODDSTYPES.ehc:
      var output = bet.output === "o1" ? "o1" : "o2"
      var odds = offer.odds[output]
      var baseline = odds / (1 / (1 / offer.odds.o1 + 1 / offer.odds.o2))
      break
    default:
      var odds = offer.odds[bet.output]
      var baseline = odds / (1 / (1 / offer.odds.o1 + 1 / offer.odds.o2))
      break
  }
  return Math.round(((bet.odds / baseline) - 1) * 100 * 10) / 10
}

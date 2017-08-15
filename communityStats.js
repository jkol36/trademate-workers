import userbetsAsJson from './userbets.json'
import firebase from 'firebase'
import numeral from 'numeral'
import moment from 'moment'

var currencies

const convertCurrency = (amount, from, to, currencies) => {
  if (from === to)
    return amount
  return currencies[from][to] * amount
}

const isValid = trade => {
  return (
    trade.status !== 1 &&
    trade.edge > 0 && 
    trade.wager > 0 &&
    trade.currency != undefined && 
    trade.match.startTime !== undefined
  )
}

const convertOddsToAmericanFormat = (decimalOdds, oddsType) => {
  switch(oddsType) {
    case 'moneyline':
      if(decimalOdds > 2.0) {
         return Math.floor(decimalOdds-1)*100
      }
      else {
        return Math.floor((-100)/(decimalOdds-1))
      }
  }
}

const floorFigure = (figure, decimals) => {
    if (!decimals) decimals = 3;
    var d = Math.pow(10,decimals);
    return (parseInt(figure*d)/d).toFixed(decimals);
}
export const convertOdds = (fromOdds, toOdds, oddsValue) => {
  switch(fromOdds) {
    case 'Decimal':
      if(toOdds === 'American') {
        return fromDecimalToAmerican(oddsValue)
      }
      return oddsValue
    case 'American':
      if(toOdds === 'Decimal')
        return americanToDecimal(oddsValue)
  }
}

const fromDecimalToAmerican = (decimalOdds) => {
  if(decimalOdds >= 2.0) 
    return Math.floor((decimalOdds-1)*(100))
  return Math.floor((-100)/(decimalOdds-1))

}

const americanToDecimal = (americanOdds) => {
  if(americanOdds > 0) 
    return floorFigure((americanOdds)/(100)+(1))
  return floorFigure((100)/(americanOdds/-1)+(1))

}

export const SPORTS = {
  1: {
    name: 'Soccer',
    icon: 'ionicons ion-ios-football'
  },
  3: {
    name: 'Basket',
    icon: 'ionicons ion-ios-basketball'
  },
  4: {
    name: 'Rugby',
    icon: 'ionicons ion-ios-americanfootball'
  },
  5: {
    name: 'Tennis',
    icon: 'ionicons ion-ios-tennisball'
  },
  6: {
    name: 'American football',
    icon: 'ionicons ion-ios-americanfootball'
  },
  7: {
    name: 'Baseball',
    icon: 'ionicons ion-ios-baseball'
  },
  8: {
    name: 'Handball',
    icon: 'ionicons ion-android-hand'
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

export const calculateCurrentBalance = (trades, user, currencies) => {
  const { mainCurrency } = user
  let balance = user.bookmakers
    .reduce((prev, cur) => prev + convertCurrency(cur.amount, cur.currency, mainCurrency, currencies), 0)
  balance += getTotalProfit(trades, mainCurrency, currencies)
  return balance
}

export const calculateBetReturn = (wager, odds, status) => {
  switch(status) {
    case 1:
    case 3:
      return 0
    case 2:
      return wager * odds
    case 4:
      return wager
    case 5:
      return (wager * (odds + 1)) / 2
    case 6:
      return wager * 0.5
    default:
      throw new Error(`Can't calculate for status ${status}`)
  }
}

export const getTotalProfit = (trades, currency, currencies) =>
  trades.reduce((prev, t) => prev + convertCurrency(calculateBetReturn(t.wager, t.odds, t.status) - t.wager,
                                                    t.currency, currency, currencies), 0)

export const getFundGrowth = (trades, user, currencies) => {
  if (trades.length === 0)
    return 0
  const { mainCurrency } = user
  const startingBalance = getStartingBalance(user, mainCurrency, currencies)
  if (!startingBalance)
    return 0
  const totalProfit = getTotalProfit(trades, mainCurrency, currencies)
  return totalProfit / startingBalance * 100 || 0
}

export const getStartingBalance = (user, currency, currencies) =>
  user.bookmakers.reduce((prev, b) => prev + convertCurrency(b.amount, b.currency, currency, currencies), 0)

export const calculateStake = (kelly, kellyFrac, balance, mainCurrency, bookmakerCurrency, currencies) =>
  Math.round(kelly * kellyFrac * convertCurrency(balance, mainCurrency, bookmakerCurrency, currencies))

const getCurrencies = () => {
  return firebase.database().ref('currencies').once('value').then(snap => {
    currencies = snap.val()
  })
}
function standardDeviation(values){
  var avg = values.reduce((p, c) => p + c, 0) / values.length;
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = squareDiffs.reduce((p, c) => p + c, 0) / squareDiffs.length;

  return Math.sqrt(avgSquareDiff);
}
const run = () => {
  const mainCurrency = 'EUR'
  const trades = Object.keys(userbetsAsJson).map(k => userbetsAsJson[k])
  let flatROI = 0
  let ev = 0
  let closingEv = 0
  let averageEdge = 0
  let averageClosingEdge = 0
  let totalTurnover = 0
  let totalProfit = 0
  let ROI = 0
  let flatProfit = 0
  let hitrate = 0
  let avgOdds = 0
  let avgOddsClosing = 0
  let avgClosing = 0
  getCurrencies()
  .then(() => {
    console.log(currencies)
    for (var t of trades) {
      if (isValid(t)) {
        ev += convertCurrency(t.wager * t.edge / 100, t.currency, mainCurrency, currencies)   
        closingEv += convertCurrency(t.wager * (t.closing || t.edge) / 100, t.currency, mainCurrency, currencies)
        averageEdge += t.edge
        averageClosingEdge += t.closing || t.edge
        totalProfit += convertCurrency(calculateBetReturn(t.wager, t.odds, t.status) - t.wager, t.currency, mainCurrency, currencies)
        totalTurnover += convertCurrency(t.wager, t.currency, mainCurrency, currencies)
        const flatp = calculateBetReturn(1, t.odds, t.status) - 1
        flatProfit += flatp
        hitrate += flatp > 0
        avgOdds += t.odds
        avgOddsClosing += t.odds / (((t.closing || t.edge) / 100) + 1)
        avgClosing += t.closing || t.edge
      }
    }
    const flatROI = flatProfit / trades.length
    const std = standardDeviation(trades.map(t => t.closing || t.edge))
    hitrate = hitrate / trades.length
    avgOdds /= trades.length
    avgOddsClosing /= trades.length
    avgClosing /= trades.length
    averageEdge = numeral(averageEdge / ((trades.length || 1) * 100)).format('0.0%')
    averageClosingEdge = numeral(averageClosingEdge / ((trades.length || 1) * 100)).format('0.0%')
    closingEv = numeral(closingEv).format('0')
    let avgTrueClosingOdds = `${numeral(avgOddsClosing).format('0.00')} ${numeral(1 / avgOddsClosing).format('0.0%')}`
    ev = numeral(ev).format('0')
    console.log('total turnover', numeral(totalTurnover).format('0.0a'))
    console.log('total profit', numeral(totalProfit).format('0'))
    console.log('average roi', numeral(totalProfit / (totalTurnover || 1)).format('0.0%'))
    console.log('flat roi', numeral(flatROI).format('0.0%') )
    console.log('closing edge standard deviation', numeral(std).format('0.0'))
    console.log('hit rate', numeral(hitrate).format('0.0%'))
    console.log('number of trades', trades.length)
    console.log('average true closing odds', avgTrueClosingOdds)
    console.log('average edge', averageEdge)
    console.log('average closing edge', averageClosingEdge)
    console.log('closing ev', closingEv)

    // firebase.database().ref('communityStats').set({
    //   averageEdge,
    //   averageClosingEdge,
    //   closingEv
    // })
  })
}

run()
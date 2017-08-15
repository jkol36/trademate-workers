import firebase from 'firebase'
import Promise from 'bluebird'
import mongoose from 'mongoose'
import raven from 'raven'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load()
}
mongoose.Promise = global.Promise = Promise
import './models'

firebase.initializeApp({
  serviceAccount: "./trademate-1c8643a327f1.json",
  databaseURL: "https://trademate-27ec1.firebaseio.com/"
})

export const ravenClient = new raven.Client('https://46b1c9a446f546b8a5049b3df09e8bca:496649945d8942d7b123d8774da58bcb@app.getsentry.com/91600');
if (process.env.NODE_ENV === 'production')
  ravenClient.patchGlobal()

export const initializeDatabase = () => {
  mongoose.connection.on('connected', () => {
    console.log('Connected to DB')
  })
  mongoose.connection.on('disconnected', () => {
    console.log('Disconnected')
  })
  mongoose.connection.on('error', err => ravenClient.captureException(err))
  return mongoose.connect(process.env.DATABASE_URL)
}

export const SENDGRID_API_KEY = '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'


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

export const recommendedLeagues = [
  // England
  8,
  70,
  15,
  32,
  95,
  // Spain
  7,
  138,
  // Italy
  13,
  14,
  // Netherlands
  1,
  103,
  // Germany
  9,
  11,
  104,
  // France,
  16,
  17,
  // Norway
  29,
  36,
  182,
  // Sweden
  28,
  37,
  // Denmark
  30,
  181,
  // Brazil
  26,
  // Belgium
  24,
  126,
  // Austria
  49,
  // Argentina
  87,
  // Finland
  22,
  // Greece
  107,
  // Poland
  120,
  // Portugal
  63,
  640,
  // Russia
  121,
  // Scotland
  43,
  45,
  176,
  // Switzerland
  27,
  // Turkey
  19,
  // USA
  33,
  // International
  10,
  18,
  385,

  // American Football
  500001,

  // Baseball
  400001,

  // Basket
  300013,
]


export const bookmakerLookup = {
  42: "William Hill",
  532: "Dafabet",
  285: "12bet / Dafabet / Mansion88 / IBCBet",
  340: "Betway",
  30: "Bwin / Partybets",
  635: "Guts",
  44: "Svenska Spel",
  118: "Nordicbet",
  274: "10BET",
  234: "5 dimes / Island Casino",
  238: "BETCRIS",
  221: "skybet",
  291: "Betfred / Tote",
  332: "Betsafe",
  327: "SBOBET",
  571: "betISN",
  365: "188bet",
  567: "Bovada",
  613: "Betfair SB",
  539: "Marathonbet",
  502: "youwin / uwin",//this one is removed from 27/01/2017
  363: "Tipico",
  342: "Betsson Sportsbook",
  244: "Coral",
  126: "Bet 365",
  84: "Paddy Power",
  43: "Danske Spil",
  41: "Norsk Tipping",
  17: "Ladbrokes",
  6: "Unibet / 888 / 32Red",
  22: "BetVictor",
  5: "Expekt",
  669: "Pokerstars",
  34: "Stan James",//this one is removed from 27/01/2017
  574: "TonyBet",
  15: "Intertops",
  212: "sportsbook.com",//this one is removed from 27/01/2017
  378: "bookmaker.eu",
  631: "NetBet",//this one is removed from 27/01/2017
  689: "Mobilbet",
  //the ones below this line was added 24/01/2017
  691: "Coolbet",
  504: "BetOnline",
  53: "TheGreek.com",
  462: "Titanbet",
  13: "Sportingbet",
  //Steve bookmakers
  2: "Centrebet",
  529: "Sportsbet",
  426: "LUXBET.com",
  65: "SportsTAB",
  661: "CrownBet",
  605: "Bluebet",
  657: "2WinBet",
  716: "uBet",
  714: "MadBookie",
  715: "TopSports"
  //palmerbet still neds top be added
}

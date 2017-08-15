import { initializeDatabase, ravenClient } from './config'
import mongoose from 'mongoose'
import { updateResultsWithInterval } from './resultfetcher'
import { updateClosingLines } from './closinglines'
import firebase from 'firebase'
import { handleStripeCustomers } from './stripe'

const UPDATE_RESULTS_INTERVAL = 1000 * 60 * 10
const UPDATE_CLOSINGLINES_INTERVAL = 1000 * 60 * 5

initializeDatabase()
  .then(() => {
    updateResultsWithInterval(UPDATE_RESULTS_INTERVAL)
    updateClosingLines(UPDATE_CLOSINGLINES_INTERVAL)
    handleStripeCustomers()
  })

const resetTradeStatus = (hoursAgo) => {
  return firebase.database().ref('usertrades').orderByChild('match/startTime').startAt(Date.now() - 1000 * 60 * 60 * hoursAgo).once('value')
    .then(res => {
      const updates = {}
      res.forEach(r => {
        updates[`${r.key}/status`] = 1
      })
      return firebase.database().ref('usertrades').update(updates)
    })
}


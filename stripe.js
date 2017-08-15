import Promise from 'bluebird'
import firebase from 'firebase'
import { throttle } from 'underscore'

const STRIPE_CUSTOMERS = new Map()

const stripe_raw = require("stripe")(
  // 'sk_test_peQPqydaJIjNk9b2OD3YDUWG'
  "sk_live_WTq0EfMcxz9EXktJHZuqwapU"
)
const stripe = Promise.promisifyAll(stripe_raw)

export const handleStripeCustomers = () => {
  getStripeCustomers()
    .then(() => {
      firebase.database().ref('users').on('child_added', snap => {
        if (!STRIPE_CUSTOMERS.get(snap.key)) {
          createStripeCustomer(snap.key, snap.val().email).catch(() => {})
          if (snap.val().referrer) {
            firebase.database().ref('reflinks').child(snap.val().referrer).child('signups').transaction(current => current + 1)
          }
        }
      })

    }).catch(err => console.error(err.stack))
}

const createStripeCustomer = (uid, email) =>
  stripe.customers.create({
    id: uid,
    email
  })

const getStripeCustomers = (starting_after=null) => {
  let query = {
    limit: 100
  }
  if (starting_after)
    query.starting_after = starting_after
  return stripe.customers.list(query)
  .then(res => {
    let last = null
    res.data.forEach(user => {
      STRIPE_CUSTOMERS.set(user.id, user)
      last = user.id
    })
    if (res.has_more)
      return getStripeCustomers(last)
  }).catch(err => console.log(err.stack))
}


const syncSubscriptions = () => {
  var updates = {}
  STRIPE_CUSTOMERS.forEach((user, uid) => {
    if (user.subscriptions.data.length > 0) {
      console.log('has sub')
      syncSubscriptionWithFirebase(uid, user.subscriptions.data[user.subscriptions.data.length - 1])
    }
  })
  firebase.database().ref().update(updates)
    .then(() => console.log('Done'))
}

const syncSubscriptionWithFirebase = (uid, sub) => {
  let updates = {}
  if (sub.status === 'active' || sub.status === 'past_due') {
    updates = {
      'uid': sub.id,
      'currentPeriodEnd': sub.current_period_end * 1000,
      'permissionLevel': (sub.plan.id === 'corem' || sub.plan.id === 'coreq') ? 1 : 2,
      'plan': sub.plan.id,
      'status': sub.status,
      'cancelAtPeriodEnd': sub.cancel_at_period_end
    }
  } else {
    updates = {
      'permissionLevel': 0,
      'plan': sub.plan.id,
      'status': sub.status,
      'currentPeriodEnd': sub.current_period_end * 1000
    }
  }
  return firebase.database().ref('users').child(uid).child('subscription').update(updates)
}
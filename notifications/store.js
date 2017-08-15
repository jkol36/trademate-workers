import { combineReducers, createStore } from 'redux'
import { recommendedLeagues, ravenClient } from '../config'
import firebase from 'firebase'
import _ from 'underscore'
import { sendEmailNotification } from '../helpers'
import mongoose from 'mongoose'

const tradeRef = firebase.database().ref('trades')
const userRef = firebase.database().ref('users')
const SEND_NOTIFICATION_INTERVAL = 1000 * 30

const byId = (state={}, action) => {
  switch(action.type) {
    case 'ADD_TRADE':
    case 'EDIT_TRADE':
      return {
        ...state,
        [action.id]: trade(state[action.id], action)
      }
    case 'DELETE_TRADE':
      let newState = { ... state }
      delete newState[action.id]
      return newState
    default:
      return state
  }
}

const trade = (state={}, action) => {
  switch(action.type) {
    case 'ADD_TRADE':
    case 'EDIT_TRADE':
      return {
        ...action.trade,
        id: action.id
      }
    default:
      return state
  }
}

const allIds = (state = [], action) => {
  switch(action.type) {
    case 'ADD_TRADE':
      return [...state, action.id]
    case 'DELETE_TRADE':
      return state.filter(id => id !== action.id)
    default:
      return state
  }
}

const trades = combineReducers({
  byId,
  allIds
})

const users = (state=[], action) => {
  switch(action.type) {
    case 'ADD_USER':
      return [...state, user({}, action)]
    case 'EDIT_USER':
      return state.map(u => {
        if (u.uid === action.uid)
          return user(u, action)
        return u
      })
    case 'REMOVE_USER':
      return state.filter(u => u.uid !== action.key)
    default:
      return state
  }
}

const user = (state={}, action) => {
  switch(action.type) {
    case 'ADD_USER':
      return {
        uid: action.key,
        email: action.user.email,
        notifications: parseNotifications(action.user.notifications),
        bookmakers: parseBookmakers(action.user.bookmakers)
      }
    case 'EDIT_USER':
      const changes = {}
      switch(action.key) {
        case 'notifications':
          changes.notifications = parseNotifications(action.value)
          break
        case 'bookmakers':
          changes.bookmakers = parseBookmakers(action.value)
          break
        case 'email':
          changes.email = action.value
          break
        default:
          return state
      }
      return {
        ...state,
        ...changes
      }
    default:
      return state
  }
}

const parseBookmakers = (bookmakers) =>
  !bookmakers ? [] : Object.keys(bookmakers).filter(k => k !== 'dummy').map(k => ({
    ...bookmakers[k],
    key: +k
  }))

const parseNotifications = (notifications) =>
  !notifications ? [] : Object.keys(notifications).filter(k => k !== 'dummy').map(k => ({
    ...notifications[k],
    key: k,
    sports: notifications[k].sport || [],
    bookmakers: notifications[k].bookmakers || []
  }))


const rootReducer = combineReducers({
  trades,
  users
})
export const store = createStore(rootReducer)

const listenToTrades = () => {
  tradeRef.on('child_added', (snap) => {
    store.dispatch({
      type: 'ADD_TRADE',
      id: snap.key,
      trade: snap.val()
    })
  })
  tradeRef.on('child_changed', (snap) => {
    store.dispatch({
      type: 'EDIT_TRADE',
      id: snap.key,
      trade: snap.val()
    })
  })

  tradeRef.on('child_removed', (snap) => {
    store.dispatch({
      type: 'DELETE_TRADE',
      id: snap.key
    })
  })
}

const listenToUsers = () => {
  userRef.orderByChild('subscription/permissionLevel').startAt(1).on('child_added', (snap) => {
    store.dispatch({
      type: 'ADD_USER',
      key: snap.key,
      user: snap.val()
    })

    userRef.child(snap.key).on('child_changed', (s => {
      store.dispatch({
        type: 'EDIT_USER',
        key: s.key,
        uid: snap.key,
        value: s.val()
      })
    }))

    userRef.child(snap.key).on('child_added', (s => {
      store.dispatch({
        type: 'EDIT_USER',
        key: s.key,
        value: s.val()
      })
    }))
  })

  userRef.orderByChild('subscription/permissionLevel').startAt(1).on('child_removed', (snap) => {
    store.dispatch({
      type: 'REMOVE_USER',
      key: snap.key
    })
    userRef.child(snap.key).off()
  })
}

const getTrades = (state) =>
  state.allIds.map(id => state.byId[id])

const getNotifications = (state) => {
  const notifications = []
  state.users.forEach(u => {
    notifications.push(...u.notifications)
  })
  return notifications
}

const findTradesToSend = () => {
  const { users } = store.getState()
  const trades = getTrades(store.getState().trades)
  const timeNow = Date.now()
  const toSend = {}
  mongoose.model('NotificationLog')
    .aggregate()
    .group({
      _id: '$user',
      matches: {
        $push: '$match'
      }
    }).then((results) => {
      const logs = _.indexBy(results, '_id')
      users.forEach(u => {
        const allBookmakers = u.bookmakers.map(b => b.key)
        let subToSend = []
        if (!u.notifications.length)
          return
        u.notifications.forEach(n => {
          const subTrades = trades.filter(t => {
            var bookmakers = n.bookmakers.length > 0 ? n.bookmakers : allBookmakers
            return (
              (!logs[u.uid] || logs[u.uid].matches.indexOf(t.matchId) === -1) &&
              t.edge >= (n.edge.gte || 0) &&
              t.edge <= (n.edge.lte || Infinity) &&
              t.odds >= (n.odds.gte || 0) &&
              t.odds <= (n.odds.lte || Infinity) &&
              bookmakers.indexOf(t.bookmaker) !== -1 &&
              t.startTime - timeNow <= n.hoursBefore * 1000 * 60 * 60 &&
              n.sports.length === 0 || n.sports.indexOf(t.sportId) !== -1 &&
              (!n.recommendedLeagues || recommendedLeagues.indexOf(t.competition.uid)) !== -1
            )
          })
          subToSend.push(...subTrades)
        })
        subToSend = _.chain(subToSend)
          .groupBy(t => t.matchId)
          .map(sub => sub.reduce((prev, cur) => prev.kelly > cur.kelly ? prev : cur))
          .value()
        if (subToSend.length > 0) {
          toSend[u.uid] = {
            trades: subToSend,
            email: u.email
          }
        }
      })
      return Promise.mapSeries(Object.keys(toSend), uid => {
        const data = toSend[uid]
        return Promise.all(data.trades.map(t => {
          return sendEmailNotification(uid, data.email, t).catch(err => {
            ravenClient.captureException(err, {
              uid,
              email: data.email,
              trade: t
            })
          })
        }))
      })
    }).then(res => {
      const toInsert = []
      res.filter(entry => !!entry).forEach(entry => {
        entry.forEach(e => {
          toInsert.push({
            user: e.uid,
            match: e.trade.matchId
          })
        })
      })
      if (toInsert.length > 0)
        return mongoose.model('NotificationLog').collection.insert(toInsert)
      return Promise.resolve()
    }).finally(() => setTimeout(findTradesToSend, SEND_NOTIFICATION_INTERVAL))
}

export const startProcesses = () => {
  listenToTrades()
  listenToUsers()
  setTimeout(findTradesToSend, SEND_NOTIFICATION_INTERVAL)
}

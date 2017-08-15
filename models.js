import mongoose, { Schema } from 'mongoose'

const notificationLogSchema = new Schema({
  user: {
    type: String,
    index: true
  },
  match: {
    type: Number,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 12
  }
})



const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema)

export const oddsSchema = mongoose.Schema({
  o1: {
    type: Number
  },
  o2: {
    type: Number
  },
  o3: {
    type: Number
  },
  o4: {
    type: Number
  },
  time: {
    type: Date
  }
})

const offerSchema = mongoose.Schema({
  _id: {
    type: Number
  },
  oddsType: {
    type: Number
  },
  bookmaker: Number,
  lastUpdated: {
    type: Date,
    index: true
  },
  flags: {
    type: Boolean,
    index: true
  },
  bmoid: {
    type: String
  },
  match: {
    type: Number,
    ref: 'Match',
    index: true
  },
  odds: [oddsSchema]
})
export const offerModel = mongoose.model('Offer', offerSchema)
export default NotificationLog

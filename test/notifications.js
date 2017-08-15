// import { expect } from 'chai'
// import { initializeDatabase } from '../config'
// import { sendPushToTopic } from '../helpers'
// import FCM from 'fcm-push'
// import mongoose from 'mongoose'

// describe('Notifications', () => {
//   // it('Should send out a test notification to a topic', done => {
//   //   const topic = '400001_41'
//   //   sendPushToTopic(topic, [1], "This is a bogus thing")
//   //     .then((res) => {
//   //       console.log(res)
//   //       done()
//   //     }).catch(done)
//   // })

//   // it('Should send out a test notification to single device', done => {
//   //   const fcm = new FCM(process.env.PUSH_SERVER_KEY)
//   //   const message = {
//   //     to: "co5TV2Lbq3M:APA91bFLfd3UXq65SheJN5UGGHMYiZ8yEZoGLGZBy6reWTnE1Rrz4ZsWbccl7Qh1WKYgbV1hJf8_kep9jCBmolGAbYB_ZLFxudpizxHf2cQWOjPbMXZIhRToF3BB0PcdUxvC2cTixGcB",
//   //     collapse_key: 'collapse_data',
//   //     data: {
//   //       custom_data: 'custom_value'
//   //     },
//   //     notification: {
//   //       title: 'This is the title',
//   //       body: 'This is the body'
//   //     }
//   //   }
//     // request.post('https://fcm.googleapis.com/fcm/send')
//     //   .set('Authorization', `key=${process.env.PUSH_SERVER_KEY}`)
//     //   .send(message)
//     //   .end((err, res) => {
//     //     if (err)
//     //       return done(err)
//     //     console.log(res.body, res.headers, res.status, res.headers['retry-after'])
//     //     done()
//     //   })
//     // fcm.send(message, (err, response) => {
//     //   if (err)
//     //     return done(err)
//     //   console.log(response)
//     //   done()
//     // })
//   // })

//   it('Should create a notification', done => {
//     initializeDatabase()
//       .then(() => mongoose.model('NotificationLog').ensureIndexes())
//       .then(() => mongoose.model('NotificationLog').create({user: '1337', match: 1337}))
//       .then(result => {
//         expect(result.user).to.equal('1337')
//         expect(result.match).to.equal(1337)
//         console.log(result.createdAt)
//         return Promise.delay(6000)
//       }).then(() => mongoose.model('NotificationLog').findOne({user: '1337', match: 1337}))
//       .then((result) => {
//         console.log(result)
//         expect(result).to.be.undefined
//         done()
//       }).catch(done)
//   })
// })

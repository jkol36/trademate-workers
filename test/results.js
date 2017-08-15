import { expect } from 'chai'
import { calculateStatus, ODDSTYPES, STATUS } from '../helpers'

describe('Result calculations', () => {
  it('Should check threeway', () => {
    const iterator = [
      {output: 'o1', score: [0,0], status: STATUS.lost},
      {output: 'o1', score: [1,0], status: STATUS.won},
      {output: 'o1', score: [0,1], status: STATUS.lost},
      {output: 'o2', score: [0,0], status: STATUS.won},
      {output: 'o2', score: [1,0], status: STATUS.lost},
      {output: 'o2', score: [0,1], status: STATUS.lost},
      {output: 'o3', score: [0,0], status: STATUS.lost},
      {output: 'o3', score: [1,0], status: STATUS.lost},
      {output: 'o3', score: [0,1], status: STATUS.won},
    ]
    for (let each of iterator) {
      var bet = {oddsType: ODDSTYPES.threeway, output: each.output}
      expect(calculateStatus(bet, each.score)).to.equal(each.status)
    }
  })

  it('Should check moneyline', () => {
    const iterator = [
      {output: 'o1', score: [1,0], status: STATUS.won},
      {output: 'o1', score: [0,1], status: STATUS.lost},
      {output: 'o2', score: [1,0], status: STATUS.lost},
      {output: 'o2', score: [0,1], status: STATUS.won},
    ]
    for (let each of iterator) {
      var bet = {oddsType: ODDSTYPES.moneyline, output: each.output}
      expect(calculateStatus(bet, each.score)).to.equal(each.status)
    }
  })

  it('Should check points and hcp', () => {
    const iterator = [
      {output: 'o1', score: [5,3], oddsTypeCondition: -3, status: STATUS.lost},
      {output: 'o2', score: [5,3], oddsTypeCondition: -3, status: STATUS.won},
      {output: 'o1', score: [5,3], oddsTypeCondition: -2, status: STATUS.void},
      {output: 'o2', score: [5,3], oddsTypeCondition: -2, status: STATUS.void},
      {output: 'o1', score: [5,3], oddsTypeCondition: -1, status: STATUS.won},
      {output: 'o1', score: [5,3], oddsTypeCondition: 1, status: STATUS.won},
      {output: 'o1', score: [5,3], oddsTypeCondition: -1.75, status: STATUS.halfwon},
      {output: 'o1', score: [5,3], oddsTypeCondition: -2.25, status: STATUS.halflost},
      {output: 'o1', score: [5,3], oddsTypeCondition: 1.75, status: STATUS.won},
      {output: 'o2', score: [2,1], oddsTypeCondition: -2.0, status: STATUS.won},
      {output: 'o2', score: [2,1], oddsTypeCondition: -2.25, status: STATUS.won}
    ]
    for (let each of iterator) {
      var bet = {oddsType: Math.random() > 0.5 ? ODDSTYPES.ahc : ODDSTYPES.ahc,
        output: each.output,
        oddsTypeCondition: each.oddsTypeCondition
      }
      expect(calculateStatus(bet, each.score), `${each.output} ${each.oddsTypeCondition}, ${each.score}`).to.equal(each.status)
    }
  })

  it('Should check totals', () => {
    const iterator = [
      {output: 'o1', score: [1,0], oddsTypeCondition: 0.5, status: STATUS.won},
      {output: 'o1', score: [1,0], oddsTypeCondition: 1.5, status: STATUS.lost},
      {output: 'o1', score: [1,0], oddsTypeCondition: 1, status: STATUS.void},
      {output: 'o1', score: [1,0], oddsTypeCondition: 1.25, status: STATUS.halflost},
      {output: 'o1', score: [1,0], oddsTypeCondition: 0.75, status: STATUS.halfwon},
      {output: 'o2', score: [1,4], oddsTypeCondition: 4.75, status: STATUS.halflost},
      {output: 'o1', score: [1,0], oddsTypeCondition: 6, status: STATUS.lost},
      {output: 'o2', score: [0,1], oddsTypeCondition: 2.5, status: STATUS.won},
      {output: 'o2', score: [4,0], oddsTypeCondition: 2.5, status: STATUS.lost},
      {output: 'o2', score: [0,1], oddsTypeCondition: 2.75, status: STATUS.won}
    ]
    for (let each of iterator) {
      var bet = {oddsType: ODDSTYPES.totals,
        output: each.output,
        oddsTypeCondition: each.oddsTypeCondition,
      }
      expect(calculateStatus(bet, each.score), `${each.output} ${each.oddsTypeCondition}, ${each.score}`).to.equal(each.status)
    }
  })

  it('Should check ehc', () => {
    const iterator = [
      {output: 'o1', score: [5,3], oddsTypeCondition: -2, status: STATUS.lost},
      {output: 'o1', score: [5,3], oddsTypeCondition: -1, status: STATUS.won},
      {output: 'o3', score: [5,3], oddsTypeCondition: -3, status: STATUS.won},
      {output: 'o3', score: [5,3], oddsTypeCondition: -2, status: STATUS.lost}
    ]
    for (let each of iterator) {
      var bet = {oddsType: ODDSTYPES.ehc,
        output: each.output,
        oddsTypeCondition: each.oddsTypeCondition,
      }
      expect(calculateStatus(bet, each.score), `${each.output} ${each.oddsTypeCondition}, ${each.score}`).to.equal(each.status)
    }
  })
})

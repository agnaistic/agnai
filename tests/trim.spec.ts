import { expect } from 'chai'
import { trimResponseV2 } from '../srv/api/chat/common'
import { toChar, toBotMsg, toProfile } from './util'

const bot = toChar('Bot')

const u1 = toProfile('Human1')
const u2 = toProfile('Human2')

const users = [u1, u2]

describe('Response trimming', () => {
  it('will trim when response suffixed by user text', () => {
    const msg = toBotMsg(bot, `aaa bbb ccc. ${u1.handle}: ddd eee fff. ${bot.name}: ggg hhh`)
    const actual = trimResponseV2(msg.msg, bot, users)
    expect(actual).to.eq('aaa bbb ccc.')
  })

  it('will concat bot responses when not interspersed with user text', () => {
    const msg = toBotMsg(bot, `aaa bbb ccc. ${bot.name}: ddd eee fff. ${u1.handle}: ggg hhh`)
    const actual = trimResponseV2(msg.msg, bot, users)
    expect(actual).to.eq('aaa bbb ccc.  ddd eee fff.')
  })

  it('will correctly handle bot name dialogue with space between name and colon', () => {
    const msg = toBotMsg(bot, `aaa bbb ccc. ${bot.name} : ddd eee fff. ${u1.handle} : ggg hhh`)
    const actual = trimResponseV2(msg.msg, bot, users)
    expect(actual).to.eq('aaa bbb ccc.  ddd eee fff.')
  })
})

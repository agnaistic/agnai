import { expect } from 'chai'
import './init'
import { reset, template } from './util'

describe('Placeholder tests', () => {
  before(reset)

  it('will not include duplicates in {{all_personalities}}', () => {
    const actual = template(`{{personality}}\n\n{{all_personalities}}`, {})

    expect(actual).toMatchSnapshot()
  })
})

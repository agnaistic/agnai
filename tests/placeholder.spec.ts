import { expect } from 'chai'
import './init'
import { template } from './util'

describe('Placeholder tests', () => {
  it('will not include duplicates in {{all_personalities}}', () => {
    const actual = template(`{{personality}}\n\n{{all_personalities}}`, {})

    expect(actual).toMatchSnapshot()
  })
})

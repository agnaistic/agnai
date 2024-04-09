import { trimSentence } from '../common/util'
import { expect } from 'chai'

describe('trimSentence', () => {
  it('should trim a sentence correctly when the sentence ends with a punctuation mark', () => {
    const text = 'Hello, world!'
    const result = trimSentence(text)
    expect(result).to.eq('Hello, world!')
  })

  it('should ignore a single orphan sentence', () => {
    const text = 'Hello, world this is a test'
    const result = trimSentence(text)
    expect(result).to.eq('Hello, world this is a test')
  })

  it('should trim a sentence correctly when the sentence contains non-Latin characters', () => {
    const text = 'こんにちは、世界！これはテストです'
    const result = trimSentence(text)
    expect(result).to.eq('こんにちは、世界！')
  })

  it('should trim a sentence correctly when the sentence contains a colon', () => {
    const text = 'Hello, world: this is a test'
    const result = trimSentence(text)
    expect(result).to.eq('Hello, world: this is a test')
  })

  it('should trim a sentence to new line ignoring orphaned punctuation', () => {
    const text = `*Hello world.*
*`
    const result = trimSentence(text)
    expect(result).to.eq('*Hello world.*')
  })

  it ('should trim a sentence to new line ignoring any number of orphans', () => {
    const text = `*Hello world.*
    * ! `
    const result = trimSentence(text)
    expect(result).to.eq('*Hello world.*')
  })

  it('should ignore possessive apostrophes', () => {
    const text = `Hello world. World's best`
    const result = trimSentence(text)
    expect(result).to.eq(`Hello world.`)
  })

  it('should ignore allowed punctuation inside words themselves', () => {
    const text = `Hello world. Washington D.C is the capital of the United States`
    const result = trimSentence(text)
    expect(result).to.eq(`Hello world.`)
  })

  it('should trim orphaned punctuation at the end of a sentence', () => {
    const text = `Hello World?" *`
    const result = trimSentence(text)
    expect(result).to.eq(`Hello World?"`)
  })

  it('should trim orphaned punctuation at the end of a sentence along with incomplete sentence', () => {
    const text = `Hello World?" * Hello`
    const result = trimSentence(text)
    expect(result).to.eq(`Hello World?"`)
  })

  it('should trim repeated orphaned punctuation', () => {
    const text = "*Hello world.*\n ***Hello      "
    const result = trimSentence(text)
    expect(result).to.eq(`*Hello world.*`)
  })
})

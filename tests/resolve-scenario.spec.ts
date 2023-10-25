import { expect } from 'chai'
import './init'
import { entities, toPersona } from './util'
import { resolveScenario } from '/common/prompt'

const { chat, main, scenarioBook } = entities

describe('Resolve scenario', () => {

    it('will use main character scenario when chat does not override characters', () => {
        const actual = resolveScenario(
            {...chat, scenario: undefined, overrides: undefined},
            {...main, scenario: 'Main char scenario'},
            [])
        expect(actual).to.equal('Main char scenario')
    })

    it('will use chat scenario when chat override is on', () => {
        const actual = resolveScenario(
            {...chat, scenario: 'Chat scenario', overrides: toPersona('Chat persona')},
            {...main, scenario: 'Main char scenario'},
            [])
        expect(actual).to.equal('Chat scenario')
    })

    it('will append additional scenarios to the main character scenario', () => {
        const book = {...scenarioBook, text: 'Additional scenario'}
        const actual = resolveScenario(
            {...chat, scenario: undefined, overrides: undefined},
            {...main, scenario: 'Main char scenario'},
            [book])
        expect(actual).to.equal('Main char scenario\nAdditional scenario')
    })

    it('will not append additional scenarios to the overriding chat scenario', () => {
        const book = {...scenarioBook, text: 'Additional scenario'}
        const actual = resolveScenario(
            {...chat, scenario: 'Chat scenario', overrides: toPersona('Chat persona')},
            {...main, scenario: 'Main char scenario'},
            [book])
        expect(actual).to.equal('Chat scenario')
    })

    it('will overwrite main character scenario when the additional scenario has overwrite flag', () => {
        const book = {...scenarioBook, text: 'Overwritten scenario', overwriteCharacterScenario: true }
        const actual = resolveScenario(
            {...chat, scenario: undefined, overrides: undefined},
            {...main, scenario: 'Main char scenario'},
            [book])
        expect(actual).to.equal('Overwritten scenario')
    })

    it('will not overwrite chat scenario when override is on and the additional scenario has overwrite flag', () => {
        const book = {...scenarioBook, text: 'Overwritten scenario', overwriteCharacterScenario: true }
        const actual = resolveScenario(
            {...chat, scenario: 'Chat scenario', overrides: toPersona('Chat persona')},
            {...main, scenario: 'Main char scenario'},
            [book])
        expect(actual).to.equal('Chat scenario')
    })
})
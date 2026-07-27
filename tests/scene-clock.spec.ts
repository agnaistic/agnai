import { expect } from 'chai'
import { parseSceneClockUpdate } from '../common/scene-clock'

describe('Scene Clock assistant updates', () => {
  it('extracts a valid partial update and removes the markup', () => {
    const result = parseSceneClockUpdate(
      '<scene_clock_update>{"date":"2026-06-29","time":"00:00","dayOfWeek":"Monday"}</scene_clock_update>\nThe bells ring at midnight.'
    )

    expect(result.text).to.equal('The bells ring at midnight.')
    expect(result.update).to.deep.equal({
      date: '2026-06-29',
      time: '00:00',
      dayOfWeek: 'Monday',
    })
  })

  it('removes malformed markup without updating the clock', () => {
    const result = parseSceneClockUpdate(
      'Time passes.<scene_clock_update>{date: tomorrow}</scene_clock_update>'
    )

    expect(result.text).to.equal('Time passes.')
    expect(result.update).to.equal(undefined)
  })

  it('accepts an update with a missing opening angle bracket', () => {
    const result = parseSceneClockUpdate(
      'scene_clock_update>\n{"date":"11/07/2026","time":"8:52 PM"}\n</scene_clock_update>\nSarah steps into the room.'
    )

    expect(result.text).to.equal('Sarah steps into the room.')
    expect(result.update).to.deep.equal({
      date: '11/07/2026',
      time: '8:52 PM',
    })
  })

  it('accepts an update with collapsed tag separators', () => {
    const result = parseSceneClockUpdate(
      'sceneclockupdate>\n{"date":"2026-07-11","time":"20:52"}\n</sceneclockupdate>\nSarah steps into the room.'
    )

    expect(result.text).to.equal('Sarah steps into the room.')
    expect(result.update).to.deep.equal({
      date: '2026-07-11',
      time: '20:52',
    })
  })

  it('accepts an asterisk-wrapped update label and object', () => {
    const result = parseSceneClockUpdate(
      '**scene_clock_update*{ "date": "15/02/2008", "time": "6:10PM" }*\nThe evening settles over the city.'
    )

    expect(result.text).to.equal('The evening settles over the city.')
    expect(result.update).to.deep.equal({
      date: '15/02/2008',
      time: '6:10PM',
    })
  })

  it('rejects non-string field values', () => {
    const result = parseSceneClockUpdate('<scene_clock_update>{"time":1230}</scene_clock_update>')

    expect(result.text).to.equal('')
    expect(result.update).to.equal(undefined)
  })

  it('accepts a valid standalone update object at the end of a response', () => {
    const result = parseSceneClockUpdate(
      'Christmas morning arrives.\n\n{"date":"2026-12-25","time":"08:00"}'
    )

    expect(result.text).to.equal('Christmas morning arrives.')
    expect(result.update).to.deep.equal({ date: '2026-12-25', time: '08:00' })
  })

  it('accepts a valid standalone update object at the start of a response', () => {
    const result = parseSceneClockUpdate(
      '{"date":"2027-01-01","time":"09:30","dayOfWeek":"Friday"}\nA new morning begins.'
    )

    expect(result.text).to.equal('A new morning begins.')
    expect(result.update).to.deep.equal({
      date: '2027-01-01',
      time: '09:30',
      dayOfWeek: 'Friday',
    })
  })

  it('does not remove an unrelated JSON object', () => {
    const response = 'The API returned:\n{"status":"ready"}'
    const result = parseSceneClockUpdate(response)

    expect(result.text).to.equal(response)
    expect(result.update).to.equal(undefined)
  })
})

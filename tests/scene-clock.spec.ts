import { expect } from 'chai'
import { parseSceneClockUpdate } from '../common/scene-clock'

describe('Scene Clock assistant updates', () => {
  it('extracts a valid partial update and removes the markup', () => {
    const result = parseSceneClockUpdate(
      'The bells ring at midnight.\n<scene_clock_update>{"date":"2026-06-29","time":"00:00","dayOfWeek":"Monday"}</scene_clock_update>'
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

  it('rejects non-string field values', () => {
    const result = parseSceneClockUpdate(
      '<scene_clock_update>{"time":1230}</scene_clock_update>'
    )

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

  it('does not remove an unrelated JSON object', () => {
    const response = 'The API returned:\n{"status":"ready"}'
    const result = parseSceneClockUpdate(response)

    expect(result.text).to.equal(response)
    expect(result.update).to.equal(undefined)
  })
})

import { describe, expect, it } from 'vitest'
import { badgeFor } from './coverage-badge'

const summary = (pct: number) => ({ total: { lines: { pct } } })

describe('badgeFor', () => {
  it('donne un badge shields.io avec le pourcentage de lignes', () => {
    expect(badgeFor('coverage front', summary(64.48))).toEqual({
      schemaVersion: 1,
      label: 'coverage front',
      message: '64.4%',
      color: 'yellow',
    })
  })

  it('change de couleur avec le pourcentage', () => {
    expect(badgeFor('c', summary(100)).color).toBe('brightgreen')
    expect(badgeFor('c', summary(82.5)).color).toBe('green')
    expect(badgeFor('c', summary(49.9)).color).toBe('red')
    expect(badgeFor('c', summary(0)).message).toBe('0%')
  })
})

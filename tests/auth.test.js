import { describe, it, expect } from 'vitest'
import { resolveRole } from '../src/auth.js'

describe('resolveRole', () => {
  it('returns admin when an admin doc exists, regardless of realtor doc', () => {
    expect(resolveRole(true, true)).toBe('admin')
    expect(resolveRole(true, false)).toBe('admin')
  })
  it('returns realtor when only a realtor doc exists', () => {
    expect(resolveRole(false, true)).toBe('realtor')
  })
  it('returns null when neither doc exists', () => {
    expect(resolveRole(false, false)).toBe(null)
  })
})

import { describe, it, expect } from 'vitest'
import {
  PASSWORD_ALPHABET,
  generatePassword,
  normalizeAccessRequest,
  buildInviteEmail,
} from '../src/realtorAccess.js'

describe('generatePassword', () => {
  it('is 10 characters by default', () => {
    expect(generatePassword()).toHaveLength(10)
  })

  it('only uses the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      for (const ch of generatePassword()) expect(PASSWORD_ALPHABET).toContain(ch)
    }
  })

  it('leaves out characters that are easy to misread', () => {
    for (const ch of '0O1lI') expect(PASSWORD_ALPHABET).not.toContain(ch)
  })

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePassword()))
    expect(seen.size).toBe(200)
  })
})

describe('normalizeAccessRequest', () => {
  it('trims the name and trims + lowercases the email', () => {
    expect(normalizeAccessRequest({ name: '  Jane Doe ', email: ' Jane@Example.COM ' }))
      .toEqual({ ok: true, name: 'Jane Doe', email: 'jane@example.com' })
  })

  it('rejects a missing name', () => {
    expect(normalizeAccessRequest({ name: '   ', email: 'a@b.co' })).toMatchObject({ ok: false })
  })

  it('rejects an email without an @ and a dot after it', () => {
    expect(normalizeAccessRequest({ name: 'A', email: 'not-an-email' })).toMatchObject({ ok: false })
    expect(normalizeAccessRequest({ name: 'A', email: 'a@b' })).toMatchObject({ ok: false })
  })

  it('rejects values longer than the rules allow', () => {
    expect(normalizeAccessRequest({ name: 'x'.repeat(101), email: 'a@b.co' })).toMatchObject({ ok: false })
    expect(normalizeAccessRequest({ name: 'A', email: `${'x'.repeat(250)}@b.co` })).toMatchObject({ ok: false })
  })
})

describe('buildInviteEmail', () => {
  it('includes the name, site link, email and password', () => {
    const text = buildInviteEmail({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Abc234xyzQ',
      siteUrl: 'https://example.github.io/Apartment/',
    })
    expect(text).toContain('Hi Jane Doe')
    expect(text).toContain('https://example.github.io/Apartment/')
    expect(text).toContain('jane@example.com')
    expect(text).toContain('Abc234xyzQ')
  })
})

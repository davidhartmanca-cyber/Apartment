import { describe, it, expect } from 'vitest'
import { STARTER_PHOTOS, pendingStarterPhotos } from '../src/starterPhotos.js'

describe('pendingStarterPhotos', () => {
  it('returns every starter photo, ordered from 1, when the gallery is empty', () => {
    const pending = pendingStarterPhotos([])
    expect(pending.map((p) => p.starterId)).toEqual(STARTER_PHOTOS.map((p) => p.starterId))
    expect(pending.map((p) => p.order)).toEqual(STARTER_PHOTOS.map((_, i) => i + 1))
  })

  it('orders starter photos after the existing photos', () => {
    const pending = pendingStarterPhotos([{ order: 1 }, { order: 4 }])
    expect(pending[0].order).toBe(5)
    expect(pending.at(-1).order).toBe(4 + STARTER_PHOTOS.length)
  })

  it('skips starter photos already in the gallery, even after a caption edit', () => {
    const [first, second] = STARTER_PHOTOS
    const existing = [
      { order: 1, starterId: first.starterId, caption: 'Renamed by admin' },
      { order: 2, starterId: second.starterId },
    ]
    const ids = pendingStarterPhotos(existing).map((p) => p.starterId)
    expect(ids).not.toContain(first.starterId)
    expect(ids).not.toContain(second.starterId)
    expect(ids).toHaveLength(STARTER_PHOTOS.length - 2)
  })

  it('returns nothing once every starter photo has been added', () => {
    const existing = STARTER_PHOTOS.map((p, i) => ({ order: i + 1, starterId: p.starterId }))
    expect(pendingStarterPhotos(existing)).toEqual([])
  })
})

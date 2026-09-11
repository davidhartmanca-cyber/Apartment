import { describe, it, expect } from 'vitest'
import { realtorVisibleDocuments, adminOnlyDocuments, filterByCategory } from '../src/documentAccess.js'

const DOCS = [
  { id: '1', category: 'pricing', visibility: 'realtor' },
  { id: '2', category: 'lease', visibility: 'admin' },
  { id: '3', category: 'floorplan', visibility: 'realtor' },
]

describe('realtorVisibleDocuments', () => {
  it('returns only realtor-visibility docs', () => {
    expect(realtorVisibleDocuments(DOCS).map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('adminOnlyDocuments', () => {
  it('returns only admin-visibility docs', () => {
    expect(adminOnlyDocuments(DOCS).map((d) => d.id)).toEqual(['2'])
  })
})

describe('filterByCategory', () => {
  it('returns all docs when category is "all" or falsy', () => {
    expect(filterByCategory(DOCS, 'all')).toEqual(DOCS)
    expect(filterByCategory(DOCS, null)).toEqual(DOCS)
  })
  it('filters by exact category match', () => {
    expect(filterByCategory(DOCS, 'pricing').map((d) => d.id)).toEqual(['1'])
  })
})

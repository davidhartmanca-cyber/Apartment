export function realtorVisibleDocuments(docs) {
  return docs.filter((d) => d.visibility === 'realtor')
}

export function adminOnlyDocuments(docs) {
  return docs.filter((d) => d.visibility === 'admin')
}

export function filterByCategory(docs, category) {
  if (!category || category === 'all') return docs
  return docs.filter((d) => d.category === category)
}

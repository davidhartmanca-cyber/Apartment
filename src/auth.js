export function resolveRole(hasAdminDoc, hasRealtorDoc) {
  if (hasAdminDoc) return 'admin'
  if (hasRealtorDoc) return 'realtor'
  return null
}

// Mirrors isRealtor() in firestore.rules: a revoked realtor keeps their doc
// with active == false; docs without the field predate revocation.
export function isActiveRealtorDoc(data) {
  return data !== undefined && data.active !== false
}

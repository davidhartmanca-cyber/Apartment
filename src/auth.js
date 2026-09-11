export function resolveRole(hasAdminDoc, hasRealtorDoc) {
  if (hasAdminDoc) return 'admin'
  if (hasRealtorDoc) return 'realtor'
  return null
}

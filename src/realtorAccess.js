// Pure helpers for realtor access requests and account grants (no Firebase).

// No 0/O, 1/l/I: the admin copies this password into an email by hand, and
// the realtor may type it.
export const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

// Must match the size limits on accessRequests in firestore.rules.
export const MAX_NAME_LENGTH = 100
export const MAX_EMAIL_LENGTH = 254

export function generatePassword(length = 10) {
  // Rejection sampling so every character is equally likely.
  const limit = 256 - (256 % PASSWORD_ALPHABET.length)
  let password = ''
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && password.length < length) {
        password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]
      }
    }
  }
  return password
}

export function normalizeAccessRequest({ name, email }) {
  const cleanName = (name ?? '').trim()
  const cleanEmail = (email ?? '').trim().toLowerCase()
  if (!cleanName) return { ok: false, error: 'Please enter your name.' }
  if (cleanName.length > MAX_NAME_LENGTH) return { ok: false, error: 'Name is too long.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' }
  if (cleanEmail.length > MAX_EMAIL_LENGTH) return { ok: false, error: 'Email is too long.' }
  return { ok: true, name: cleanName, email: cleanEmail }
}

export function buildInviteEmail({ name, email, password, siteUrl }) {
  return [
    `Hi ${name},`,
    '',
    'Your realtor access has been approved. You can sign in on the Realtors tab at:',
    siteUrl,
    '',
    `Email: ${email}`,
    `Password: ${password}`,
    '',
    'Please keep this password private.',
  ].join('\n')
}

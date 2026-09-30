// Stock photos an admin can copy into the gallery from the Content Editor.
// Once added they are ordinary gallery entries (uploaded to Storage), so they
// can be recaptioned, reordered or deleted like any other photo. `starterId`
// is stored on the gallery doc so each one is only ever added once.
export const STARTER_PHOTOS = [
  { starterId: 'pool', caption: 'Resident pool and courtyard', url: 'https://images.unsplash.com/photo-1580041065738-e72023775cdc?auto=format&fit=crop&w=1600&q=80' },
  { starterId: 'living-room', caption: 'Bright, open living room', url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80' },
  { starterId: 'kitchen', caption: 'Modern kitchen', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80' },
  { starterId: 'bedroom', caption: 'Comfortable bedroom', url: 'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?auto=format&fit=crop&w=1600&q=80' },
  { starterId: 'living-space', caption: 'Spacious living space', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80' },
  { starterId: 'common-area', caption: 'Cozy common area', url: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1600&q=80' },
]

// Starter photos not yet in `existingPhotos`, each given an `order` that
// places it after the current last photo.
export function pendingStarterPhotos(existingPhotos) {
  const added = new Set(existingPhotos.map((p) => p.starterId).filter(Boolean))
  const maxOrder = existingPhotos.reduce((max, p) => Math.max(max, p.order ?? 0), 0)
  return STARTER_PHOTOS
    .filter((p) => !added.has(p.starterId))
    .map((p, i) => ({ ...p, order: maxOrder + i + 1 }))
}

# Apartment Complex Website — Design Spec

Date: 2026-09-11
Status: Approved for planning

## Purpose

A website for a single apartment complex with three access tiers:

- **Public** — anyone: home page + a photo/info page.
- **Realtor** — logged-in realtors: a document library (floor plans, pricing/availability, lease/legal docs).
- **Admin** — logged-in admin(s): everything realtors see, plus an admin-only document library, and the ability to edit the public site's text/images and manage the realtor library.

This is a single-property site (not built for multi-tenancy). It starts as a simple test deployment on GitHub Pages, with a documented path to move to Cloudflare later.

## Precedent

This project reuses the stack and patterns already proven in `SVS-Clinics` (sibling project at `C:\Users\dahar\OneDrive\Documents\GitHub\SVS-Clinics`):

- Vue 3 + Vite build
- Firebase (Auth + Firestore + Storage)
- Firestore security rules using an `admins/{uid}` marker-doc pattern for role checks
- Local development against Firebase emulators only — `npm run dev` never touches live data
- GitHub Actions → GitHub Pages deployment
- Vitest for logic tests, `@firebase/rules-unit-testing` against the emulator for security-rule tests

## Architecture

Single-page Vue 3 app built with Vite. Firebase provides:

- **Auth** — email/password accounts for realtors and admin(s). No public sign-up.
- **Firestore** — site content, gallery metadata, document metadata, and the role-marker collections.
- **Storage** — actual image and document files.

The built static output (`dist/`) deploys via GitHub Actions to GitHub Pages, matching `SVS-Clinics`'s `DEPLOY.md` pattern (correct `base` path in `vite.config.js`, SPA-fallback `404.html`, Firebase authorized-domains entry for the Pages domain). Because the output is a static bundle, moving to Cloudflare Pages later is a hosting-only change — no app changes needed.

## Roles & Auth

Three tiers, checked client-side via Firestore marker docs (mirroring `SVS-Clinics`'s `isAdmin()` rule pattern) and enforced server-side by Firestore/Storage security rules — never trust client-side role checks alone for anything sensitive.

- **Public**: no Firebase Auth account. Can read public content and gallery data.
- **Realtor**: has a Firebase Auth account AND a `realtors/{uid}` Firestore doc. Grants read access to realtor-visibility documents.
- **Admin**: has a Firebase Auth account AND an `admins/{uid}` Firestore doc. Grants read access to all documents (realtor + admin visibility) and write access to site content, gallery, and document metadata.

### Account provisioning

No self-registration for any privileged role.

- **First admin**: created manually in the Firebase Console (bootstraps the same way `SVS-Clinics` does — rules require an existing admin to grant admin, so the first one must be created out-of-band).
- **Realtors**: provisioned by a local Node script (`scripts/create-realtor.mjs`, modeled on `SVS-Clinics/scripts/`) that:
  1. Uses `firebase-admin` with a service account key (gitignored, never committed) to create the Firebase Auth user by email.
  2. Writes the matching `realtors/{uid}` Firestore doc (email, display name, `addedAt`).
  3. Triggers a Firebase password-reset email so the realtor sets their own password.

  This avoids needing a server or Cloud Function for account creation — the site stays a pure static SPA.

## Data Model (Firestore)

| Collection | Doc ID | Fields | Purpose |
|---|---|---|---|
| `admins/{uid}` | Firebase Auth UID | (marker doc, no fields required) | Existence = admin role |
| `realtors/{uid}` | Firebase Auth UID | `email`, `name`, `addedAt` | Existence = realtor role |
| `content/site` | fixed id `site` | `heroTitle`, `heroSubtitle`, `description`, `amenities` (array of strings), `contactInfo` (map: phone, email, address) | Structured public-site content, admin-editable via a form |
| `gallery/{docId}` | auto-id | `storagePath`, `caption`, `order` (number) | One doc per public photo |
| `documents/{docId}` | auto-id | `title`, `category` (`'floorplan' \| 'pricing' \| 'lease'`), `storagePath`, `uploadedAt`, `uploadedBy` (uid), `visibility` (`'realtor' \| 'admin'`) | One doc per library file; `visibility` determines who can see it |

There is deliberately **no** separate "admin library" collection — an admin-only document is just a `documents` doc with `visibility: 'admin'`. This keeps the document manager UI and rules simpler (one collection, one visibility filter) rather than duplicating logic across two collections.

## Storage Layout

| Path | Read | Write |
|---|---|---|
| `/gallery/*` | public (`true`) | admin only |
| `/documents/realtor/*` | realtor or admin | admin only |
| `/documents/admin/*` | admin only | admin only |

Document metadata (`documents/{docId}.storagePath`) must point into the matching `/documents/{visibility}/...` prefix — the upload UI enforces this by constructing the path from the chosen visibility, and the rules trust Firestore metadata as the access gate (Storage rules independently re-check visibility by path prefix, matching the Firestore doc's own read rule, so a leaked download URL alone isn't sufficient — Storage rules must still authenticate the request).

## Security Rules

Firestore rules add an `isRealtor()` helper alongside `SVS-Clinics`'s `isAdmin()` pattern:

```
function isAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
function isRealtor() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/realtors/$(request.auth.uid));
}
```

- `content/site`: `read: true`; `write: isAdmin()`.
- `gallery/{docId}`: `read: true`; `write: isAdmin()`.
- `documents/{docId}`: `read: isAdmin() || (isRealtor() && resource.data.visibility == 'realtor')`; `write: isAdmin()`.
- `admins/{uid}`: `read: request.auth != null`; `write: isAdmin()` (matches `SVS-Clinics` — first admin doc created via Console, bypassing rules).
- `realtors/{uid}`: `read: isAdmin() || (request.auth != null && request.auth.uid == uid)`; `write: isAdmin()`.

Storage rules mirror the same role checks, gated on path prefix (`/documents/realtor/*` vs `/documents/admin/*`) rather than reading Firestore metadata (Storage rules can call `firestore.get()` but keeping the check on path prefix alone is simpler and avoids cross-service rule coupling).

## Pages & Components

**Public (no auth)**
- `Home` — hero section + short overview, sourced from `content/site`.
- `GalleryInfo` — photo gallery (`gallery` collection, ordered) + amenities/description/contact info from `content/site`.

**Realtor (requires realtor or admin role)**
- `DocumentLibrary` — lists `documents` where `visibility == 'realtor'` (admins additionally see `visibility == 'admin'` docs here or in a separate admin view — see below), filterable by category, with download links to Storage.

**Admin (requires admin role)**
- Everything in Realtor, plus:
- `AdminLibrary` — documents with `visibility == 'admin'`.
- `ContentEditor` — form for `content/site` fields (hero text, description, amenities, contact info) and gallery management (upload photo → Storage, create `gallery` doc; delete photo → delete Storage object + doc; reorder → update `order` field).
- `DocumentManager` — upload a file to the correct Storage path based on chosen visibility, create the matching `documents` doc; delete a document (Storage object + Firestore doc together).

**Shared**
- `LoginForm` — email/password sign-in, used by both realtor and admin routes.
- A route guard that checks the current user's role (via the marker-doc lookups) before rendering realtor/admin routes, redirecting unauthenticated or unauthorized users to the login form or home page.

## Testing

- **Vitest** for pure logic (content validation, category filtering, etc.), matching `SVS-Clinics`'s `npm test`.
- **`@firebase/rules-unit-testing`** against the Firestore/Storage emulators for security rules, matching `SVS-Clinics`'s `npm run test:rules`. This is the highest-value test surface here, since the entire point of the design is the three-tier access boundary — tests should cover: public read of `content/site`/`gallery` succeeds and write fails; realtor can read `visibility: 'realtor'` docs but not `visibility: 'admin'` docs; realtor cannot write any collection; admin can read/write everything; an unauthenticated user cannot read `documents` at all.
- Manual smoke test of the deployed GitHub Pages site (login flow, document download, content edit round-trip) before considering a milestone done.

## Out of Scope (v1)

- Multi-property support.
- Public contact/inquiry form.
- Self-registration or admin-approval workflows for realtors.
- Free-form rich-text/WYSIWYG editing of public content (structured fields only).
- Cloud Functions / server backend of any kind.

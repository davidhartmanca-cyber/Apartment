# Deploying

## First-time setup

1. Create a Firebase project (Firebase Console -> Add project). Enable:
   - Authentication -> Sign-in method -> Email/Password
   - Firestore Database
   - Storage
2. Deploy the security rules: `firebase deploy --only firestore:rules,storage:rules --project <your-project-id>`
3. In the Firebase Console, manually create the first admin:
   - Authentication -> Add user (email/password)
   - Firestore -> create a document at `admins/<that user's UID>` with no fields
4. Copy the web app config (Project Settings -> General -> Your apps -> SDK setup and configuration) into `src/firebase.js`, replacing the placeholder `firebaseConfig`.
5. Update `.firebaserc` and the `--project` flags in `package.json` scripts to your real project id, if different from `apartment-site`.
6. Confirm `vite.config.js`'s `base` matches your GitHub repo name exactly (e.g. `/Apartment/`).

## Enable GitHub Pages

1. Repo Settings -> Pages -> Source: GitHub Actions.
2. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.
3. Site will be live at `https://<username>.github.io/Apartment/`.

## After deploying

Add the GitHub Pages domain to Firebase: Authentication -> Settings -> Authorized domains -> Add domain -> `<username>.github.io`.

## Adding a realtor

```bash
node scripts/create-realtor.mjs realtor@example.com "Realtor Name"
```

This requires `scripts/serviceAccountKey.json` (Project Settings -> Service Accounts -> Generate new private key), which is gitignored and must never be committed.

## Moving to Cloudflare later

The build output (`dist/`) is a plain static bundle. To move: point Cloudflare Pages at this repo with build command `npm run build` and output directory `dist`, then add the Cloudflare Pages domain to Firebase's authorized domains the same way as above.

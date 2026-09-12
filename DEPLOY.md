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
6. Confirm `vite.config.js`'s `base` matches your GitHub repo name exactly (e.g. `/Apartment/`). `public/404.html` hardcodes the same value in its own `base` variable — if you ever rename the repo, update both files together, or deep links will redirect to the wrong path.

**Ordering matters:** steps 3 (create the first admin) and 4 (replace the placeholder Firebase config) must both be done *before* the first push to `main`. If you push first, the deployed site is built against the non-working placeholder config.

## Enable GitHub Pages

1. Repo Settings -> Pages -> Source: GitHub Actions.
2. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically (gated on the CI workflow passing first).
3. Site will be live at `https://<username>.github.io/Apartment/`.

## After deploying

1. Add the GitHub Pages domain to Firebase: Authentication -> Settings -> Authorized domains -> Add domain -> `<username>.github.io`.
2. Configure CORS on the production Storage bucket so document downloads (which use `getBlob()`) work — they succeed against the local emulator with no CORS setup, but silently fail in production without it: `gsutil cors set cors.json gs://<your-bucket>`. See https://cloud.google.com/storage/docs/using-cors for the CORS JSON format.
3. Seed initial content: log in as admin -> Edit Content -> fill in the fields -> Save. This creates the `content/site` doc (via `setDoc(..., {merge:true})`); until it exists, the Home and Gallery pages render blank with no explanation.

## Adding a realtor

```bash
node scripts/create-realtor.mjs realtor@example.com "Realtor Name"
```

This requires `scripts/serviceAccountKey.json` (Project Settings -> Service Accounts -> Generate new private key), which is gitignored and must never be committed.

The script only prints a password-reset link to the console — it does not email the realtor. Copy that link and send it to them yourself (email, text, etc.).

## Smoke test before calling a deploy done

- [ ] Log in as admin
- [ ] Log in as a realtor
- [ ] Download a document and confirm the file actually downloads (not just that no error appeared)
- [ ] Edit site content and confirm it appears on the public Home page

## Moving to Cloudflare later

The build output (`dist/`) is a plain static bundle. To move: point Cloudflare Pages at this repo with build command `npm run build` and output directory `dist`, then add the Cloudflare Pages domain to Firebase's authorized domains the same way as above.

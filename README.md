# UWR Roster

Lineup builder for underwater rugby coaches. Coaches pick the squad for each
tournament and game from the player pool and drag players into positions
(goalkeeper, defender, attacker, substitute). Finnish and English, works on
phones and desktops.

Built with React + TypeScript (Vite) on Firebase (Hosting, Authentication, Firestore).

## Access

Only invited coaches can use the app.

- Coaches sign in with an **email link** (no passwords).
- An invite is a document in the `coaches` collection, keyed by the lowercase
  email, with `role` set to `admin` or `coach`.
- Admins invite and remove coaches on the **Coaches** page. The invite email is
  the sign-in link itself.
- Firestore security rules (`firestore.rules`) enforce this on the server.

## One-time Firebase setup

Project: `uwrroster`.

1. **Authentication → Sign-in method**: enable **Email/Password** and turn on
   **Email link (passwordless sign-in)**.
2. **Authentication → Settings → Authorized domains**: make sure the hosting
   domains (`uwrroster.web.app`, `uwrroster.firebaseapp.com`) are listed.
3. **Project settings → Your apps**: add a Web app, copy its config into
   `.env.local` (see `.env.example`).
4. **Firestore**: create the first admin by hand. Add a document to the
   `coaches` collection with ID = your email in lowercase and fields
   `email` (same email) and `role` = `admin`.
5. Deploy (below). After that, invite other coaches from the app.

## Development

```sh
npm install
cp .env.example .env.local   # fill in the web app config
npm run dev
```

To develop without touching the real project, run the local emulators and set
`VITE_USE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-uwrroster` in
`.env.local`:

```sh
npm run emulators            # Auth + Firestore + emulator UI
npm run dev
```

In emulator mode, sign-in links are not emailed; they appear in the emulator UI
and the emulator's terminal output.

## Tests

```sh
npm test                     # unit tests
npm run test:rules           # Firestore security rules against the emulator (needs Java)
npm run lint
```

## Deploy

```sh
npx firebase login           # with the Google account that owns the uwrroster project
npm run deploy               # builds and deploys Hosting + Firestore rules
```

# Pointless

Planning poker for teams. No signup, no database — just create a session and share the link.

## Getting started

```bash
nvm use 22
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How it works

1. Create a session and pick a point scale
2. Share the invite link (or QR code) with your team
3. Everyone joins by entering their name
4. Add stories to estimate, vote, and reveal cards together
5. When you're done, export a results link to share or save

## Running tests

`npm install` automatically downloads the Playwright browser. Then:

```bash
npm test
```

This starts the dev servers, runs the end-to-end tests, and shuts down.

For interactive debugging with Playwright's UI:

```bash
npm run test:ui
```

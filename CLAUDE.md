# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the backend for **Biblioteka Zosi** / "MamaLibrary" — a library/book-lending management app (books, categories, places/shelves, readers, borrowings, admin login). It's a Firebase Cloud Functions app (Node/Express) and is normally checked out as a sibling of its frontend counterpart, `MamaWebsiteFront` (`koalabzium/MamaWebsiteFront`, a separate git repo/remote) — the two are developed together but versioned independently.

## Commands

Run from `functions/`:
- `npm run serve` — run functions locally via the Firebase emulator (`firebase emulators:start --only functions`)
- `npm run shell` — interactive Firebase functions shell
- `npm run deploy` — `firebase deploy --only functions`
- `npm run logs` — tail deployed function logs

There is no automated test suite. Local dev requires the Firebase CLI (`firebase-tools`) installed and authenticated, plus the service-account JSON (`functions/mamusiaLibrary-227be22cdd3a.json`) and `functions/.env` (`JWT_SECRET`) present — both are already in the tree but are secrets, not something to regenerate.

## Architecture

`functions/index.js` is the single Express app entry point, exported as two Firebase HTTPS functions: `app` (default region) and `appEurope` (europe-west1 — this is the one the frontend actually points at). It wires up global middleware (`cors`, `morgan`, JSON body parsing), initializes `firebase-admin` with the service-account credential, and mounts one router per resource under `functions/services/`:

- `BooksService.js` → `/books`
- `CategoriesService.js` → `/categories`
- `PlacesService.js` → `/places`
- `ReadersService.js` → `/readers`
- `BorrowingsService.js` → `/borrowings`

`POST /login` (defined directly in `index.js`, not a service) checks a bcrypt-hashed password against the `users` Firestore collection and returns a signed JWT.

Key patterns to follow when touching this backend:
- **Firestore, no ORM.** Every service does `admin.firestore()` and talks to collections (`books`, `categories`, `places`, `readers`, `borrowings`, `users`) directly with the raw Firestore SDK — no repository/model layer.
- **IDs** are generated client-side-in-server (`utils/IdUtils.js`: `Date.now()` + a random suffix), not Firestore auto-IDs, and used as the document key (`doc(book.id).set(...)`).
- **Auth** is a single JWT check: `utils/AuthUtils.js` exports `verifyToken` (Express middleware, reads `Authorization: Bearer <token>`) and `signToken`. The secret comes from Firebase Functions config (`functions.config().mamalibrary.secret`), *not* from `functions/.env`'s `JWT_SECRET` — mutating/deleting routes use `verifyToken` as route middleware; GET routes are public.
- **Books ↔ Borrowings are denormalized and manually kept in sync.** A book document carries `available`/`quantity` counters; creating a borrowing (`BorrowingsService.js`) decrements `book.available` by the borrowed quantity, and cancelling one (`POST /borrowings/:id/cancel`) restores it. There's no transaction — read-then-write races are possible, so when editing this flow keep both writes consistent by hand.
- **Search/sort/pagination for books is done in memory**, not via Firestore queries: `GET /books` fetches the (optionally category/place-filtered) collection, then filters by `search` and sorts/paginates in JS (`PAGE_SIZE = 10`).
- Responses are largely un-normalized — errors return `{message}` or `{error}` inconsistently depending on the route; match the existing convention in the specific service file you're editing rather than inventing a new shape.

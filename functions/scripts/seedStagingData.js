/**
 * Wipes and reseeds the STAGING Firestore project with obviously-fake,
 * humorous data (5 categories, 2 places, 20 books, 5 readers, a couple of
 * borrowings, one admin login user). Safe to rerun any time as a
 * "reset staging to clean fake data" tool.
 *
 * NEVER run this against production. As a safety net, it refuses to run
 * unless the service-account key it's given actually belongs to the
 * staging project.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/staging-key.json \
 *     node functions/scripts/seedStagingData.js
 *
 * Optional: SEED_ADMIN_PASSWORD=<password> to set the admin login password
 * explicitly. If omitted, a random one is generated and printed once at the
 * end of the run — nothing about the admin password is ever hardcoded here,
 * so it can't end up committed to source control.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const EXPECTED_PROJECT_ID = "mamusialibrary-staging";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a service-account " +
      `key for the ${EXPECTED_PROJECT_ID} project and try again.`
  );
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(path.resolve(keyPath), "utf8"));
if (key.project_id !== EXPECTED_PROJECT_ID) {
  console.error(
    `Refusing to run: GOOGLE_APPLICATION_CREDENTIALS points at project ` +
      `"${key.project_id}", not "${EXPECTED_PROJECT_ID}". This script only ` +
      `ever touches the staging project.`
  );
  process.exit(1);
}

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(key) });
const db = getFirestore();

const generateId = () => {
  let id = Date.now();
  id += Math.floor(Math.random() * 1000).toString();
  return id;
};

const CATEGORIES = [
  { name: "Fantastyka i Smoki" },
  { name: "Kryminały z Kotem w Roli Głównej" },
  { name: "Poradniki Przetrwania Poniedziałku" },
  { name: "Romanse dla Zaawansowanych" },
  { name: "Literatura Faktu (czyli jak nie robić rzeczy)" },
].map((c) => ({ id: generateId(), ...c }));

const PLACES = [
  { name: "Półka Numer 7 (ta chwiejna)" },
  { name: "Szafa Babci w Salonie" },
].map((p) => ({ id: generateId(), ...p }));

const catId = (i) => CATEGORIES[i % CATEGORIES.length].id;
const placeId = (i) => PLACES[i % PLACES.length].id;

const BOOK_SEEDS = [
  ["Jak Nauczyłem Kota Czytać", "Anonimowy Optymista"],
  ["Zupa Pomidorowa: Powieść Kryminalna", "Zenon Zupka"],
  ["50 Sposobów na Zgubienie Pilota", "Jan Poszukiwacz"],
  ["Smok, Który Bał Się Wysokości", "Krystyna Łuskowata"],
  ["Poniedziałek Rano: Horror", "Dr. Kawa Czarna"],
  ["Miłość w Cenie Promocyjnej", "Bożena Serduszko"],
  ["Detektyw Mruczek i Zaginiona Skarpetka", "Kocia Agatha"],
  ["Smoki Też Miewają Alergie", "Prof. Łuska"],
  ["Jak Przetrwać Rodzinny Obiad", "Ciotka Wszystkowiedząca"],
  ["Romans o Trzeciej Nad Ranem", "Sennaia Westchnienie"],
  ["Wielka Księga Wymówek Biurowych", "Tadeusz Odkładalski"],
  ["Smok Kontra Odkurzacz", "Kapitan Ogień"],
  ["Kryminał w Bibliotece: Kto Ukradł Zakładkę?", "Detektyw Stronica"],
  ["Poniedziałkowa Dieta Cud (Nie Działa)", "Dietetyk Sceptyczny"],
  ["Jak Zdobyć Serce Smoka w 10 Krokach", "Miłośniczka Łusek"],
  ["Fakty, Których Nikt Nie Chciał Znać", "Redakcja Ciekawostek"],
  ["Kot, Który Rozwiązał Zbrodnię Zamiast Policji", "W. Wąsacz"],
  ["Przewodnik po Ucieczkach ze Spotkań Rodzinnych", "Anonim (Naprawdę)"],
  ["Ostatni Smok na Diecie Bezglutenowej", "Weganka Łuskowata"],
  ["Autobiografia Kanapy: Jak Przetrwałam Ten Dom", "Kanapa Sama"],
];

const BOOKS = BOOK_SEEDS.map(([title, author], i) => {
  const quantity = 1 + (i % 4);
  return {
    id: generateId(),
    title,
    author,
    description: `Zdecydowanie fikcyjna książka o tytule "${title}" — część zestawu testowego środowiska staging.`,
    link: "",
    image: "",
    location: "",
    quantity,
    available: quantity,
    borrowing: [],
    category: catId(i),
    place: placeId(i),
  };
});

const READERS = [
  "Józef Nieoddaje Książek",
  "Krystyna Zawsze Się Spóźnia",
  "Piotr Zapomniał Karty Bibliotecznej",
  "Ciotka Zosia (testowa)",
  "Anonimowy Czytelnik #1",
].map((name) => ({ id: generateId(), name }));

const adminPassword =
  process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
const ADMIN_USER = {
  name: "admin",
  password: bcrypt.hashSync(adminPassword, 10),
};

const buildBorrowings = () => {
  const [readerA, readerB] = READERS;
  const [bookA, bookB] = BOOKS;

  const active = {
    id: generateId(),
    bookId: bookA.id,
    readerId: readerA.id,
    readerName: readerA.name,
    date: new Date().toISOString().slice(0, 10),
    active: true,
    quantity: 1,
    bookTitle: bookA.title,
    bookAuthor: bookA.author,
  };

  const returned = {
    id: generateId(),
    bookId: bookB.id,
    readerId: readerB.id,
    readerName: readerB.name,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    active: false,
    quantity: 1,
    bookTitle: bookB.title,
    bookAuthor: bookB.author,
  };

  // Reflect the active borrowing's effect on the book's availability,
  // matching what BorrowingsService.js does at runtime.
  bookA.available = bookA.quantity - active.quantity;

  return [active, returned];
};

const BORROWINGS = buildBorrowings();

async function wipeCollection(name) {
  const snap = await db.collection(name).get();
  const batchSize = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`Wiped ${docs.length} doc(s) from "${name}"`);
}

async function writeAll(name, docs) {
  const batch = db.batch();
  docs.forEach((doc) => batch.set(db.collection(name).doc(String(doc.id)), doc));
  await batch.commit();
  console.log(`Wrote ${docs.length} doc(s) to "${name}"`);
}

async function main() {
  console.log(`Reseeding STAGING project "${EXPECTED_PROJECT_ID}"...`);

  for (const name of ["books", "categories", "places", "readers", "borrowings", "users"]) {
    await wipeCollection(name);
  }

  await writeAll("categories", CATEGORIES);
  await writeAll("places", PLACES);
  await writeAll("books", BOOKS);
  await writeAll("readers", READERS);
  await writeAll("borrowings", BORROWINGS);
  await db.collection("users").doc(ADMIN_USER.name).set(ADMIN_USER);
  console.log(`Wrote 1 doc(s) to "users"`);

  console.log("\nDone. Staging admin login:");
  console.log(`  name:     ${ADMIN_USER.name}`);
  console.log(`  password: ${adminPassword}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

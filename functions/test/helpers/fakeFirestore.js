// A tiny in-memory stand-in for the subset of the Firestore SDK this
// codebase actually uses: collection(name).doc(id).{set,get,delete,update}
// and collection(name)[.where(field, "==", value)...].get(). Wired in via
// functions/__mocks__/firebase-admin.js so every service gets the same
// instance through the shared functions/utils/db.js.

function createDocSnapshot(id, data) {
  return {
    id,
    exists: data !== undefined,
    data: () => (data === undefined ? undefined : { ...data }),
  };
}

function createFakeFirestore() {
  const store = new Map(); // collectionName -> Map<id, data>

  const collectionMap = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name);
  };

  const makeDocRef = (collectionName, id) => ({
    get: async () => createDocSnapshot(id, collectionMap(collectionName).get(id)),
    set: async (data, options) => {
      const map = collectionMap(collectionName);
      const next =
        options && options.merge ? { ...(map.get(id) || {}), ...data } : { ...data };
      map.set(id, next);
    },
    update: async (partial) => {
      const map = collectionMap(collectionName);
      map.set(id, { ...(map.get(id) || {}), ...partial });
    },
    delete: async () => {
      collectionMap(collectionName).delete(id);
    },
  });

  const matches = (data, filters) =>
    filters.every(({ field, op, value }) => {
      if (op !== "==") {
        throw new Error(`fakeFirestore: unsupported operator "${op}"`);
      }
      return data[field] === value;
    });

  const makeQuery = (collectionName, filters) => ({
    where: (field, op, value) =>
      makeQuery(collectionName, [...filters, { field, op, value }]),
    get: async () => {
      const docs = [...collectionMap(collectionName).entries()]
        .filter(([, data]) => matches(data, filters))
        .map(([id, data]) => createDocSnapshot(id, data));
      return { docs };
    },
  });

  const collection = (name) => ({
    ...makeQuery(name, []),
    doc: (id) => makeDocRef(name, id),
  });

  return {
    collection,
    __reset: () => store.clear(),
    __seed: (collectionName, id, data) => {
      collectionMap(collectionName).set(id, { ...data });
    },
  };
}

module.exports = createFakeFirestore();

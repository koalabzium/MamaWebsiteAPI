const router = require("../../services/PlacesService");
const { runCrudSuite } = require("./simpleCrud.shared");

runCrudSuite({
  router,
  mountPath: "/places",
  collectionName: "places",
  label: "Places",
});

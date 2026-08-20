const router = require("../../services/CategoriesService");
const { runCrudSuite } = require("./simpleCrud.shared");

runCrudSuite({
  router,
  mountPath: "/categories",
  collectionName: "categories",
  label: "Categories",
});

import {
  listProducts,
  formatPrice,
  ProductQueryValidationError,
  type Product,
} from "./products.ts";

function fail(msg: string): never {
  console.error(`FAIL (${msg})`);
  process.exit(1);
}

function run(): void {
  // Test 1: full catalog returned.
  const all = listProducts();
  if (all.length < 8) fail(`full list: expected >= 8 products, got ${all.length}`);
  console.log(`PASS (full list): ${all.length} products`);

  // Test 2: copy semantics — distinct reference and mutation-safe.
  const a = listProducts();
  const b = listProducts();
  if (a === b) fail("copy semantics: expected distinct array references");
  a.pop();
  if (listProducts().length !== b.length) fail("copy semantics: mutation leaked into catalog");
  console.log("PASS (copy semantics): returns independent copies");

  // Test 3: category filter, case-insensitive.
  const elec = listProducts({ category: "electronics" });
  if (elec.length === 0 || !elec.every((p: Product) => p.category === "Electronics")) {
    fail("category filter: expected only Electronics products");
  }
  console.log(`PASS (category filter): ${elec.length} Electronics products`);

  // Test 4: non-matching category returns empty array (not an error).
  const none = listProducts({ category: "Nonexistent" });
  if (none.length !== 0) fail(`empty match: expected [], got ${none.length}`);
  console.log("PASS (empty match): non-matching category returns []");

  // Test 5: sort by price ascending and descending.
  const priceAsc = listProducts({ sortBy: "price" });
  for (let i = 1; i < priceAsc.length; i++) {
    if (priceAsc[i].price < priceAsc[i - 1].price) fail("price asc: not monotonic ascending");
  }
  const priceDesc = listProducts({ sortBy: "price", sortDirection: "desc" });
  for (let i = 1; i < priceDesc.length; i++) {
    if (priceDesc[i].price > priceDesc[i - 1].price) fail("price desc: not monotonic descending");
  }
  console.log("PASS (sort by price): asc and desc ordered correctly");

  // Test 6: sort by name ascending and descending.
  const nameAsc = listProducts({ sortBy: "name" });
  for (let i = 1; i < nameAsc.length; i++) {
    if (nameAsc[i].name.localeCompare(nameAsc[i - 1].name) < 0) fail("name asc: out of order");
  }
  const nameDesc = listProducts({ sortBy: "name", sortDirection: "desc" });
  for (let i = 1; i < nameDesc.length; i++) {
    if (nameDesc[i].name.localeCompare(nameDesc[i - 1].name) > 0) fail("name desc: out of order");
  }
  console.log("PASS (sort by name): asc and desc ordered correctly");

  // Test 7: default order preserves catalog/source order.
  const def = listProducts();
  const filteredDef = listProducts({ category: "Home" });
  const expectedHome = def.filter((p) => p.category === "Home");
  if (filteredDef.map((p) => p.id).join(",") !== expectedHome.map((p) => p.id).join(",")) {
    fail("default order: filtered list did not preserve source order");
  }
  console.log("PASS (default order): source order preserved");

  // Test 8: validation — bad sortBy.
  try {
    listProducts({ sortBy: "bogus" as never });
    fail("validation sortBy: expected ProductQueryValidationError");
  } catch (err) {
    if (!(err instanceof ProductQueryValidationError) || err.issues.length === 0) {
      fail(`validation sortBy: unexpected error ${(err as Error).message}`);
    }
  }
  console.log("PASS (validation): bad sortBy rejected");

  // Test 9: validation — bad sortDirection.
  try {
    listProducts({ sortDirection: "sideways" as never });
    fail("validation sortDirection: expected ProductQueryValidationError");
  } catch (err) {
    if (!(err instanceof ProductQueryValidationError) || err.issues.length === 0) {
      fail(`validation sortDirection: unexpected error ${(err as Error).message}`);
    }
  }
  console.log("PASS (validation): bad sortDirection rejected");

  // Test 10: validation — empty/whitespace category.
  try {
    listProducts({ category: "   " });
    fail("validation category: expected ProductQueryValidationError");
  } catch (err) {
    if (!(err instanceof ProductQueryValidationError) || err.issues.length === 0) {
      fail(`validation category: unexpected error ${(err as Error).message}`);
    }
  }
  console.log("PASS (validation): empty/whitespace category rejected");

  // Test 11: formatPrice renders USD minor units correctly.
  const nineteen: Product = {
    id: "t1",
    name: "T",
    description: "",
    price: 1999,
    currency: "USD",
    category: "Test",
    imageUrl: "",
    inStock: true,
  };
  if (formatPrice(nineteen) !== "$19.99") fail(`formatPrice: expected "$19.99", got ${formatPrice(nineteen)}`);
  const five: Product = { ...nineteen, price: 500 };
  if (formatPrice(five) !== "$5.00") fail(`formatPrice: expected "$5.00", got ${formatPrice(five)}`);
  const euro: Product = { ...nineteen, price: 1999, currency: "EUR" };
  if (formatPrice(euro) !== "19.99 EUR") fail(`formatPrice: expected "19.99 EUR", got ${formatPrice(euro)}`);
  console.log("PASS (formatPrice): USD and non-USD rendered correctly");

  console.log("ALL PASS");
  process.exit(0);
}

run();

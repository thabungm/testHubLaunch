export interface Product {
  id: string;
  name: string;
  description: string;
  // price is stored as integer minor units (e.g. 1999 = $19.99).
  price: number;
  currency: string; // ISO 4217 code, e.g. "USD"
  category: string;
  imageUrl: string;
  inStock: boolean;
}

export interface ListProductsOptions {
  category?: string;
  sortBy?: "price" | "name";
  sortDirection?: "asc" | "desc";
}

export class ProductQueryValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid product query: ${issues.join("; ")}`);
    this.name = "ProductQueryValidationError";
    this.issues = issues;
  }
}

// Hardcoded sample catalog. Prices are integer minor units, all USD.
const PRODUCTS: Product[] = [
  {
    id: "elec-001",
    name: "Wireless Headphones",
    description: "Over-ear Bluetooth headphones with active noise cancellation.",
    price: 19999,
    currency: "USD",
    category: "Electronics",
    imageUrl: "https://example.com/img/elec-001.jpg",
    inStock: true,
  },
  {
    id: "elec-002",
    name: "Mechanical Keyboard",
    description: "Compact 75% mechanical keyboard with hot-swappable switches.",
    price: 8999,
    currency: "USD",
    category: "Electronics",
    imageUrl: "https://example.com/img/elec-002.jpg",
    inStock: false,
  },
  {
    id: "elec-003",
    name: "USB-C Charger",
    description: "65W GaN fast charger with dual USB-C ports.",
    price: 3499,
    currency: "USD",
    category: "Electronics",
    imageUrl: "https://example.com/img/elec-003.jpg",
    inStock: true,
  },
  {
    id: "book-001",
    name: "The Pragmatic Programmer",
    description: "Classic guide to software craftsmanship and career growth.",
    price: 2999,
    currency: "USD",
    category: "Books",
    imageUrl: "https://example.com/img/book-001.jpg",
    inStock: true,
  },
  {
    id: "book-002",
    name: "Clean Code",
    description: "A handbook of agile software craftsmanship.",
    price: 3599,
    currency: "USD",
    category: "Books",
    imageUrl: "https://example.com/img/book-002.jpg",
    inStock: false,
  },
  {
    id: "home-001",
    name: "Ceramic Pour-Over Dripper",
    description: "Single-cup pour-over coffee dripper in matte white.",
    price: 2499,
    currency: "USD",
    category: "Home",
    imageUrl: "https://example.com/img/home-001.jpg",
    inStock: true,
  },
  {
    id: "home-002",
    name: "Scented Soy Candle",
    description: "Hand-poured soy candle with a 50-hour burn time.",
    price: 1499,
    currency: "USD",
    category: "Home",
    imageUrl: "https://example.com/img/home-002.jpg",
    inStock: true,
  },
  {
    id: "home-003",
    name: "Linen Throw Blanket",
    description: "Lightweight stonewashed linen throw, 50x60 inches.",
    price: 6500,
    currency: "USD",
    category: "Home",
    imageUrl: "https://example.com/img/home-003.jpg",
    inStock: false,
  },
  {
    id: "appr-001",
    name: "Merino Wool Beanie",
    description: "Soft, breathable merino wool beanie in charcoal.",
    price: 2200,
    currency: "USD",
    category: "Apparel",
    imageUrl: "https://example.com/img/appr-001.jpg",
    inStock: true,
  },
  {
    id: "appr-002",
    name: "Organic Cotton T-Shirt",
    description: "Classic-fit tee made from 100% organic cotton.",
    price: 1999,
    currency: "USD",
    category: "Apparel",
    imageUrl: "https://example.com/img/appr-002.jpg",
    inStock: true,
  },
];

export function validateListProductsOptions(options: ListProductsOptions): void {
  const issues: string[] = [];

  if (options.category !== undefined) {
    if (typeof options.category !== "string" || !options.category.trim()) {
      issues.push("category must be a non-empty string");
    }
  }
  if (options.sortBy !== undefined && options.sortBy !== "price" && options.sortBy !== "name") {
    issues.push("sortBy must be 'price' or 'name'");
  }
  if (
    options.sortDirection !== undefined &&
    options.sortDirection !== "asc" &&
    options.sortDirection !== "desc"
  ) {
    issues.push("sortDirection must be 'asc' or 'desc'");
  }

  if (issues.length) throw new ProductQueryValidationError(issues);
}

export function listProducts(options: ListProductsOptions = {}): Product[] {
  validateListProductsOptions(options);

  // Always operate on a copy; never mutate or return the internal catalog.
  let result = [...PRODUCTS];

  if (options.category) {
    const wanted = options.category.trim().toLowerCase();
    result = result.filter((p) => p.category.toLowerCase() === wanted);
  }

  if (options.sortBy) {
    const dir = options.sortDirection === "desc" ? -1 : 1;
    if (options.sortBy === "price") {
      result.sort((a, b) => (a.price - b.price) * dir);
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name) * dir);
    }
  }

  return result;
}

export function formatPrice(product: Product): string {
  const amount = (product.price / 100).toFixed(2);
  if (product.currency === "USD") return `$${amount}`;
  return `${amount} ${product.currency}`;
}

function main(): void {
  const argv = process.argv.slice(2);
  const opts: ListProductsOptions = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--category") {
      opts.category = argv[i + 1];
      i++;
    } else if (token === "--sort") {
      opts.sortBy = argv[i + 1] as ListProductsOptions["sortBy"];
      i++;
    } else if (token === "--direction") {
      opts.sortDirection = argv[i + 1] as ListProductsOptions["sortDirection"];
      i++;
    }
  }

  try {
    const list = listProducts(opts);
    console.log(JSON.stringify(list, null, 2));
    process.exit(0);
  } catch (err) {
    if (err instanceof ProductQueryValidationError) {
      console.error("Validation failed:");
      for (const i of err.issues) console.error(`  - ${i}`);
    } else {
      console.error(`Product query error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

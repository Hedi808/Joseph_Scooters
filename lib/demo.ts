import type { Product } from "./model";
const names = [
  "Urban One",
  "City Glide",
  "Long Way",
  "Avenue E",
  "Horizon E",
  "Compact E",
  "Casque urbain",
  "Antivol pliant",
  "Sacoche de guidon",
  "Pneu urbain",
  "Plaquettes de frein",
  "Chambre à air",
];
const prices = [
  1890000, 2490000, 2990000, 4200000, 5400000, 3900000, 129000, 99000, 79000,
  65000, 39000, 29000,
];
export const demoProducts: Product[] = names.map((name, i): Product => {
  const category = ["scooters", "ebikes", "accessories", "spare-parts"][
    Math.floor(i / 3)
  ];
  const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  return {
    id,
    name: `${name} — Démo`,
    slug: `demo-${name
      .toLowerCase()
      .replaceAll(" ", "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")}`,
    sku: `DEMO-${i + 1}`,
    brand: "Atelier Démo",
    category_slug: category,
    description:
      "Modèle fictif pour tester la boutique. Visuel illustratif et caractéristiques de démonstration : ne constituent pas une offre commerciale.",
    price_millimes: prices[i],
    stock: i === 2 ? 0 : 8,
    featured: i < 6,
    status: "published",
    demo: true,
    image: `/art/${category}.svg`,
    motor_w: i < 6 ? (i < 3 ? 350 : 250) : null,
    battery_wh: i < 6 ? 360 + i * 50 : null,
    range_km: i < 6 ? 30 + i * 8 : null,
    speed_kmh: i < 6 ? 25 : null,
    weight_kg: i < 6 ? 17 + i : 1,
    wheel_inches: i < 6 ? (i < 3 ? 10 : 28) : null,
    foldable: i < 3,
    specifications:
      i < 6
        ? {
            Freins: "Disque — valeur démo",
            Charge: "6 h — valeur démo",
            "Charge maximale": "100 kg — valeur démo",
            Suspension: "Avant — valeur démo",
          }
        : {},
    created_at: "2026-11-01T00:00:00Z",
    variants:
      i < 6
        ? [
            {
              id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
              product_id: id,
              name: "Graphite",
              sku: `DEMO-${i + 1}-G`,
              price_millimes: prices[i],
              stock: i === 2 ? 0 : 4,
              color: "Graphite",
            },
          ]
        : [],
  };
});

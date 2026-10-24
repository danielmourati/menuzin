import { itemsForPrinter } from "../src/lib/print-routing.ts";

const routing = {
  products: {
    suco: { category_id: "bebidas", print_location_ids: ["sucos"] },
    pastel: { category_id: "pasteis", print_location_ids: ["cozinha"] },
    coca: { category_id: "bebidas", print_location_ids: [] },
    avulso: { category_id: null, print_location_ids: [] },
  },
  categories: { bebidas: ["sucos"] },
};
const items = [{ productId: "suco" }, { productId: "pastel" }, { productId: "coca" }, { productId: "avulso" }];
const active = ["cozinha", "sucos"];
let fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) fail++;
  console.log(ok ? "ok" : "FAIL", name, got);
};
eq("cozinha recebe pastel e avulso", itemsForPrinter(items, "cozinha", "cozinha", routing, active).map((i) => i.productId), ["pastel", "avulso"]);
eq("sucos recebe suco e coca (herda categoria)", itemsForPrinter(items, "sucos", "cozinha", routing, active).map((i) => i.productId), ["suco", "coca"]);
eq("local inativo cai no padrão", itemsForPrinter(items, "cozinha", "cozinha", routing, ["cozinha"]).map((i) => i.productId), ["suco", "pastel", "coca", "avulso"]);
if (fail) process.exit(1);

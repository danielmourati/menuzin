#!/usr/bin/env node
/**
 * SSR Smoke Test
 *
 * Hits every route against a running server (default http://localhost:8080)
 * and verifies:
 *   - HTTP status is 200
 *   - HTML body is non-trivial (no blank screen)
 *   - No catastrophic SSR error markers in the body
 *
 * Usage:
 *   node scripts/ssr-smoke-test.mjs                       # uses BASE_URL or http://localhost:8080
 *   BASE_URL=https://menuzin.lovable.app node scripts/ssr-smoke-test.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

// Sample params used to exercise dynamic routes.
const SAMPLE_SLUG = "burger-prime";
const SAMPLE_ORDER_ID = "1001";

const routes = [
  "/",
  "/admin/login",
  "/admin/dashboard",
  "/admin/pedidos",
  "/admin/produtos",
  "/admin/categorias",
  "/admin/aparencia",
  "/admin/configuracoes",
  "/admin/configuracoes/pagamentos",
  "/admin/configuracoes/pedidos",
  "/platform/dashboard",
  "/platform/lojas",
  "/platform/tenants/novo",
  `/loja/${SAMPLE_SLUG}`,
  `/loja/${SAMPLE_SLUG}/acompanhar/${SAMPLE_ORDER_ID}`,
  `/loja/${SAMPLE_SLUG}/pedido-confirmado?n=${SAMPLE_ORDER_ID}`,
];

// Markers that indicate an SSR failure surfaced as HTML/JSON.
const ERROR_MARKERS = [
  "This page didn't load",
  '"unhandled":true',
  '"message":"HTTPError"',
  "SSR rendering failed",
];

// Minimum body length to consider the response non-blank.
const MIN_BODY_BYTES = 500;

const results = [];

function fmt(ms) {
  return `${ms.toString().padStart(4)}ms`;
}

for (const path of routes) {
  const url = `${BASE_URL}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
    const elapsed = Date.now() - started;
    const body = await res.text();

    const isRedirect = res.status >= 300 && res.status < 400;
    const ok2xx = res.status === 200;
    const acceptable = ok2xx || isRedirect;

    const errorMarker = ERROR_MARKERS.find((m) => body.includes(m));
    const blank = ok2xx && body.length < MIN_BODY_BYTES;

    const pass = acceptable && !errorMarker && !blank;
    results.push({ path, status: res.status, bytes: body.length, elapsed, pass, errorMarker, blank });

    const tag = pass ? "✅" : "❌";
    const extra = !pass
      ? `  ← ${errorMarker ? `error marker: ${errorMarker}` : blank ? "blank body" : "bad status"}`
      : "";
    console.log(`${tag} ${res.status} ${fmt(elapsed)} ${body.length.toString().padStart(7)}B  ${path}${extra}`);
  } catch (err) {
    const elapsed = Date.now() - started;
    results.push({ path, status: 0, bytes: 0, elapsed, pass: false, errorMarker: String(err) });
    console.log(`❌ ERR ${fmt(elapsed)}        -  ${path}  ← ${err.message || err}`);
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} routes passed (against ${BASE_URL})`);

if (failed.length > 0) {
  console.error(`\n${failed.length} route(s) failed:`);
  for (const r of failed) {
    console.error(`  - ${r.path} → status=${r.status} ${r.errorMarker ? `marker="${r.errorMarker}"` : r.blank ? "(blank)" : ""}`);
  }
  process.exit(1);
}

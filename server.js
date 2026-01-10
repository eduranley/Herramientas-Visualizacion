import express from "express";
import path from "path";
import fs from "fs/promises";

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();
const DATA_PATH = path.join(__dirname, "ventas.json");

// Servir archivos estáticos (dashboard.html)
app.use(express.static(path.join(__dirname, "public")));

async function readData() {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Actualiza precio, ventas e ingresos de forma coherente:
// - precio varía ±5%
// - ventas varían inversamente al precio (elasticidad -0.6) + ruido
// - ingresos ≈ ventas * precio (±3% ruido)
function mutateData(data) {
  return data.map((row) => {
    const oldPrice = row.precio;

    // 1) Precio: variación ±5%
    const priceFactor = 1 + (Math.random() * 0.10 - 0.05); // 0.95..1.05
    const newPrice = round2(clamp(oldPrice * priceFactor, 50, 5000));

    // 2) Ventas: relación inversa al precio + ruido
    const elasticity = -0.6;
    const priceChangePct = (newPrice - oldPrice) / oldPrice;
    const baseSales = row.ventas * (1 + elasticity * priceChangePct);

    const noiseSales = 1 + (Math.random() * 0.16 - 0.08); // ±8%
    const newSales = Math.round(clamp(baseSales * noiseSales, 1, 20000));

    // 3) Ingresos: ventas * precio (con ruido ±3%)
    const noiseRevenue = 1 + (Math.random() * 0.06 - 0.03);
    const newRevenue = Math.round(newSales * newPrice * noiseRevenue);

    return { ...row, precio: newPrice, ventas: newSales, ingresos: newRevenue };
  });
}

// API: datos actuales
app.get("/api/ventas", async (_req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "No se pudo leer ventas.json", detail: String(err) });
  }
});

// API: actualiza y devuelve datos nuevos
app.get("/api/actualizar", async (_req, res) => {
  try {
    const current = await readData();
    const updated = mutateData(current);
    await writeData(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "No se pudo actualizar ventas.json", detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor listo: http://localhost:${PORT}`);
  console.log(`   Dashboard:     http://localhost:${PORT}/dashboard.html`);
});

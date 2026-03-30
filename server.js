const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "onyx_realty",
  password: "232623",
  port: 5432,
});

app.get("/contratos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM contratos ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/pagos", async (req, res) => {
  try {
    const { contrato_id } = req.query;
    const r =
      contrato_id ?
        await pool.query(
          "SELECT * FROM pagos WHERE contrato_id=$1 ORDER BY fecha_pago DESC",
          [contrato_id],
        )
      : await pool.query("SELECT * FROM pagos ORDER BY fecha_pago DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/pagos", async (req, res) => {
  try {
    const { contrato_id, monto, fecha_pago, mes, anio, metodo, notas } =
      req.body;
    const r = await pool.query(
      "INSERT INTO pagos (contrato_id, monto, fecha_pago, mes, anio, metodo, notas) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        contrato_id,
        monto,
        fecha_pago,
        mes,
        anio,
        metodo || "transferencia",
        notas || "",
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/estado", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM v_estado_contratos ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/morosos", async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const r = await pool.query(
      "SELECT c.id, c.apt_nombre, c.tenant, c.rent FROM contratos c WHERE c.activo = TRUE AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.contrato_id = c.id AND p.mes = $1 AND p.anio = $2)",
      [mes, anio],
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("OK Onyx API en http://localhost:3000"));

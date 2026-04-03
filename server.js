const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.get('/contratos', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM contratos WHERE activo = true ORDER BY id'); res.json(r.rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/contratos', async (req, res) => {
  const { id, apt_nombre, tenant, address, apt, rent, deposit, pay_day, start_base, notary, notes } = req.body;
  if (!id || !tenant || !rent) return res.status(400).json({ error: 'Faltan campos requeridos' });
  try {
    const r = await pool.query(
      'INSERT INTO contratos (id, apt_nombre, tenant, address, apt, rent, deposit, pay_day, start_base, notary, notes, activo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *',
      [id, apt_nombre, tenant, address, apt, parseFloat(rent), parseFloat(deposit||0), parseInt(pay_day), start_base, notary||'', notes||'']
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/contratos/:id', async (req, res) => {
  const { apt_nombre, tenant, address, apt, rent, deposit, pay_day, start_base, notary, notes } = req.body;
  try {
    const r = await pool.query(
      'UPDATE contratos SET apt_nombre=$1,tenant=$2,address=$3,apt=$4,rent=$5,deposit=$6,pay_day=$7,start_base=$8,notary=$9,notes=$10 WHERE id=$11 RETURNING *',
      [apt_nombre, tenant, address, apt, parseFloat(rent), parseFloat(deposit||0), parseInt(pay_day), start_base, notary||'', notes||'', req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/pagos', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC'); res.json(r.rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/pagos', async (req, res) => {
  const { contrato_id, monto, fecha_pago, mes, anio, metodo, notas } = req.body;
  if (!contrato_id || !monto || !fecha_pago || mes == null || !anio)
    return res.status(400).json({ error: 'Faltan campos requeridos: contrato_id, monto, fecha_pago, mes, anio' });
  if (isNaN(parseFloat(monto)) || parseFloat(monto) <= 0)
    return res.status(400).json({ error: 'Monto inválido' });
  if (mes < 1 || mes > 12)
    return res.status(400).json({ error: 'Mes inválido (1-12)' });
  try {
    // Verify contract exists
    const chk = await pool.query('SELECT id FROM contratos WHERE id = $1 AND activo = true', [contrato_id]);
    if (chk.rowCount === 0) return res.status(400).json({ error: 'Contrato no encontrado o inactivo' });
    const r = await pool.query(
      'INSERT INTO pagos (contrato_id, monto, fecha_pago, mes, anio, metodo, notas) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [contrato_id, monto, fecha_pago, mes, anio, metodo||'transferencia', notas||null]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/notas/:contrato_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notas_inquilino WHERE contrato_id = $1 ORDER BY created_at DESC', [req.params.contrato_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/notas', async (req, res) => {
  const { contrato_id, nota } = req.body;
  try {
    const r = await pool.query('INSERT INTO notas_inquilino (contrato_id, nota) VALUES ($1,$2) RETURNING *', [contrato_id, nota]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/notas/:id', async (req, res) => {
  try { await pool.query('DELETE FROM notas_inquilino WHERE id = $1', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/expulsiones/:contrato_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM expulsiones WHERE contrato_id = $1', [req.params.contrato_id]);
    res.json(r.rows[0] || null);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/expulsiones', async (req, res) => {
  const { contrato_id, motivo } = req.body;
  try {
    await pool.query('DELETE FROM expulsiones WHERE contrato_id = $1', [contrato_id]);
    const r = await pool.query('INSERT INTO expulsiones (contrato_id, motivo) VALUES ($1,$2) RETURNING *', [contrato_id, motivo]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/expulsiones/:contrato_id', async (req, res) => {
  try { await pool.query('DELETE FROM expulsiones WHERE contrato_id = $1', [req.params.contrato_id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.sendFile(require('path').join(__dirname, 'onyx_realty.html')));

app.get('/estado', async (req, res) => {
  try {
    const contratos = await pool.query('SELECT * FROM contratos WHERE activo = true ORDER BY id');
    const pagos = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC');
    const mapped = contratos.rows.map(c => ({
      id: c.id, aptNombre: c.apt_nombre, tenant: c.tenant,
      address: c.address, apt: c.apt, rent: parseFloat(c.rent),
      deposit: parseFloat(c.deposit), startBase: c.start_base,
      payDay: c.pay_day, notary: c.notary, notes: c.notes, activo: c.activo
    }));
    res.json({ contratos: mapped, pagos: pagos.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/morosos', async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const r = await pool.query(
      'SELECT c.* FROM contratos c WHERE c.activo = true AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.contrato_id = c.id AND p.mes = $1 AND p.anio = $2)',
      [mes, anio]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Onyx API running on port ' + PORT));

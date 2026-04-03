var fs = require('fs');
var s = fs.readFileSync('server.js', 'utf8');

var newRoutes = `
app.get('/estado', async (req, res) => {
  try {
    const contratos = await pool.query('SELECT * FROM contratos WHERE activo = true ORDER BY id');
    const pagos = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC');
    res.json({ contratos: contratos.rows, pagos: pagos.rows });
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

`;

s = s.replace("app.get('/health'", newRoutes + "app.get('/health'");
fs.writeFileSync('server.js', s);
console.log('OK - rutas agregadas');

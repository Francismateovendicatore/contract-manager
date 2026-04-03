var fs = require('fs');
var s = fs.readFileSync('server.js', 'utf8');

var oldRoute = `app.get('/estado', async (req, res) => {
  try {
    const contratos = await pool.query('SELECT * FROM contratos WHERE activo = true ORDER BY id');
    const pagos = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC');
    res.json({ contratos: contratos.rows, pagos: pagos.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});`;

var newRoute = `app.get('/estado', async (req, res) => {
  try {
    const contratos = await pool.query('SELECT * FROM contratos WHERE activo = true ORDER BY id');
    const pagos = await pool.query('SELECT * FROM pagos ORDER BY fecha_pago DESC');
    const mapped = contratos.rows.map(c => ({
      id: c.id,
      aptNombre: c.apt_nombre,
      tenant: c.tenant,
      address: c.address,
      apt: c.apt,
      rent: parseFloat(c.rent),
      deposit: parseFloat(c.deposit),
      startBase: c.start_base,
      payDay: c.pay_day,
      notary: c.notary,
      notes: c.notes,
      activo: c.activo
    }));
    res.json({ contratos: mapped, pagos: pagos.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});`;

s = s.replace(oldRoute, newRoute);
fs.writeFileSync('server.js', s);
console.log('OK');

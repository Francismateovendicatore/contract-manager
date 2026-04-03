var fs = require('fs');
var s = fs.readFileSync('server.js', 'utf8');
var newLine = "app.get('/', (req, res) => res.sendFile(require('path').join(__dirname, 'onyx_realty.html')));";
if (s.indexOf("onyx_realty.html") === -1) {
  s = s.replace("app.get('/health'", newLine + "\napp.get('/health'");
  fs.writeFileSync('server.js', s);
  console.log('OK - ruta / agregada');
} else {
  console.log('Ya tiene la ruta /');
}

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const LOGS_BASE_DIR = path.join(__dirname, 'logs', 'requests');

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function sanitizePathForFileName(routePath) {
  const cleanedPath = routePath.replace(/^\/+|\/+$/g, '');
  return cleanedPath === '' ? 'root' : cleanedPath.replace(/[\\/:*?"<>|]/g, '_');
}

function getTimestampParts(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const millis = String(date.getMilliseconds()).padStart(3, '0');

  return {
    dateFolder: `${year}-${month}-${day}`,
    timeFile: `${hours}-${minutes}-${seconds}-${millis}`
  };
}

function writeRequestLog({ req, statusCode, durationMs, startedAt }) {
  const timestamp = getTimestampParts(startedAt);
  const methodFolder = req.method.toUpperCase();
  const endpointName = sanitizePathForFileName(req.path);
  const requestFolder = path.join(LOGS_BASE_DIR, timestamp.dateFolder, methodFolder);

  ensureDirectory(requestFolder);

  const fileName = `${timestamp.timeFile}__${endpointName}.txt`;
  const filePath = path.join(requestFolder, fileName);

  const logContent = [
    `timestamp: ${startedAt.toISOString()}`,
    `method: ${req.method}`,
    `path: ${req.path}`,
    `originalUrl: ${req.originalUrl}`,
    `statusCode: ${statusCode}`,
    `durationMs: ${durationMs}`,
    `ip: ${req.ip}`,
    `query: ${JSON.stringify(req.query)}`,
    `params: ${JSON.stringify(req.params)}`,
    `body: ${JSON.stringify(req.body)}`,
    `headers: ${JSON.stringify(req.headers, null, 2)}`
  ].join('\n');

  fs.writeFileSync(filePath, `${logContent}\n`, 'utf-8');
}

// Middleware para parsear JSON
app.use(express.json());

// Middleware para registrar cada peticion HTTP en archivos txt
app.use((req, res, next) => {
  const startedAt = new Date();
  const startedAtMs = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAtMs;

    try {
      writeRequestLog({
        req,
        statusCode: res.statusCode,
        durationMs,
        startedAt
      });
    } catch (error) {
      console.error('No se pudo guardar el log de la peticion:', error.message);
    }
  });

  next();
});

// Ruta dinámica para servir archivos JSON (acepta todos los métodos HTTP)
app.all('/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, `${fileName}.json`);

  console.log(`[${req.method}] /${fileName} - Solicitado`);

  // Verificar si el archivo existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      error: 'Archivo no encontrado',
      message: `No se encontró el archivo ${fileName}.json` 
    });
  }

  // Leer y devolver el contenido del archivo JSON
  try {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(jsonData);
    res.json(parsedData);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al leer el archivo',
      message: error.message 
    });
  }
});

// Ruta para listar todos los archivos JSON disponibles
app.get('/', (req, res) => {
  const files = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  res.json({
    message: 'Servicio de endpoints manuales',
    endpoints_disponibles: files,
    uso: 'Accede a localhost:3000/{nombre-archivo} para obtener el JSON'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
  console.log(`Sirviendo archivos JSON desde: ${__dirname}`);
  console.log(`Logs de peticiones en: ${LOGS_BASE_DIR}`);
});

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

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
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Sirviendo archivos JSON desde: ${__dirname}`);
});

// Servicio REST receptor de documentos firmados - Node.js/Express
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' })); // Para manejar archivos grandes en Base64

// Endpoint para recibir documentos firmados
app.post('/grabar_archivos_firmados', (req, res) => {
    try {
        const {
            cedula,
            nombreDocumento,
            archivo, // Base64
            firmasValidas,
            integridadDocumento,
            error,
            certificado
        } = req.body;

        // Validar datos requeridos
        if (!cedula || !nombreDocumento || !archivo) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }

        // Decodificar archivo Base64
        const buffer = Buffer.from(archivo, 'base64');

        // Crear directorio si no existe
        const outputDir = path.join(__dirname, 'documentos_firmados');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Guardar archivo
        const filePath = path.join(outputDir, `${cedula}_${nombreDocumento}`);
        fs.writeFileSync(filePath, buffer);

        // Log de la recepción
        console.log(`Documento firmado recibido: ${nombreDocumento} para cédula: ${cedula}`);
        console.log(`Firmas válidas: ${firmasValidas}, Integridad: ${integridadDocumento}`);

        // Respuesta de confirmación
        res.json({ status: 'OK', message: 'Documento recibido correctamente' });

    } catch (error) {
        console.error('Error procesando documento firmado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint de prueba
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Receptor FirmaEC' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servicio receptor ejecutándose en puerto ${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/grabar_archivos_firmados`);
});
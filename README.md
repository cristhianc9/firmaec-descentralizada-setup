# FirmaEC Descentralizada

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Java](https://img.shields.io/badge/Java-21-orange)](https://openjdk.java.net/)
[![JBoss EAP](https://img.shields.io/badge/JBoss%20EAP-8.0-red)](https://www.redhat.com/en/technologies/jboss-middleware/application-platform)

Repositorio de configuración e implementación de FirmaEC Descentralizada para instituciones públicas y privadas del Ecuador.

## 📋 Descripción

FirmaEC Descentralizada es una solución de firma electrónica digital que permite a las instituciones implementar procesos de firma digital en su propia infraestructura, manteniendo la soberanía tecnológica y cumpliendo con las normativas del Gobierno Electrónico del Ecuador.

Este repositorio contiene la documentación técnica completa y herramientas necesarias para configurar un ambiente de desarrollo y producción de FirmaEC Descentralizada.

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sistema       │    │   FirmaEC       │    │   Base de       │
│   Requirente    │◄──►│  Descentralizada│◄──►│   Datos         │
│                 │    │                 │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Servicio      │
                    │   Receptor      │
                    │   REST          │
                    └─────────────────┘
```

### Componentes Principales

- **firmadigital-api**: Servicios REST para integración con aplicaciones externas
- **firmadigital-servicio**: Lógica de negocio y procesamiento de firmas
- **firmadigital-libreria**: Utilidades y algoritmos de firma digital
- **Servicio Receptor**: API REST para recepción de documentos firmados

## 🚀 Inicio Rápido

### Prerrequisitos

- **Java**: JDK 21+
- **Maven**: 3.9+
- **Podman/Docker**: Para contenedores
- **JBoss EAP**: 8.0
- **PostgreSQL**: 12+

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/cristhianc9/firmaec-decentralizada.git
   cd firmaec-decentralizada
   ```

2. **Configurar ambiente**
   - **Windows**: Ver [README-INSTALACION-WINDOWS.md](README-INSTALACION-WINDOWS.md)
   - **RHEL 9**: Ver [README-INSTALACION-RHEL9.md](README-INSTALACION-RHEL9.md)

3. **Compilar proyectos**
   ```bash
   # Clonar y compilar proyectos fuente
   git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-libreria.git
   git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-api.git
   git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-servicio.git

   # Compilar en orden
   cd firmadigital-libreria && mvn clean package
   cd ../firmadigital-api && mvn clean package
   cd ../firmadigital-servicio && mvn clean package
   ```

4. **Configurar base de datos**
   ```bash
   # Iniciar PostgreSQL
   podman run -d --name postgresql_firmadigital \
     -e POSTGRESQL_USER=firmadigital \
     -e POSTGRESQL_PASSWORD=firmadigital \
     -e POSTGRESQL_DATABASE=firmadigital \
     -p 5432:5432 \
     docker.io/centos/postgresql-96-centos7

   # Crear tabla e insertar registro de prueba
   podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "
   CREATE TABLE sistema (id SERIAL PRIMARY KEY, nombre VARCHAR(255), descripcion VARCHAR(255), url VARCHAR(255), apikey VARCHAR(255), apikeyrest VARCHAR(255));
   INSERT INTO sistema VALUES (1, 'pruebas', 'Sistema de pruebas', 'http://localhost/pruebas', 'hash_sha256_del_api_key', '');"
   ```

5. **Configurar JBoss EAP**
   ```bash
   # Crear usuario administrador
   cd $JBOSS_HOME/bin
   ./add-user.sh

   # Configurar datasource y variables
   ./jboss-cli.sh --connect --command="
   module add --name=org.postgresql --resources=postgresql-42.7.3.jar --dependencies=javax.api,javax.transaction.api
   /subsystem=datasources/jdbc-driver=postgresql:add(driver-name=postgresql,driver-module-name=org.postgresql,driver-xa-datasource-class-name=org.postgresql.xa.PGXADataSource)
   data-source add --name=FirmaDigitalDS --jndi-name=java:/FirmaDigitalDS --driver-name=postgresql --connection-url=jdbc:postgresql://localhost:5432/firmadigital --user-name=firmadigital --password=firmadigital
   /system-property=firmadigital-servicio.url:add(value=\"http://localhost:8080/servicio\")
   "
   ```

6. **Desplegar aplicaciones**
   ```bash
   cp firmadigital-api/target/api.war $JBOSS_HOME/standalone/deployments/
   cp firmadigital-servicio/target/servicio.war $JBOSS_HOME/standalone/deployments/
   ```

7. **Configurar servicio receptor**
   ```bash
   cd servicio-receptor
   npm install
   npm start
   ```

## 📚 Documentación

- **[Manual Oficial FirmaEC](Manual-de-Implementacion-FirmaEC-Institucional-Decentralizada-2.1.0.pdf)**: Documentación completa del sistema
- **[Instalación Windows](README-INSTALACION-WINDOWS.md)**: Guía detallada para Windows con Podman
- **[Instalación RHEL 9](README-INSTALACION-RHEL9.md)**: Guía detallada para Red Hat Enterprise Linux 9

## 🔧 API Endpoints

### FirmaEC API
- `POST /servicio/documentos` - Crear documentos para firmar
- `GET /api/version` - Versión del sistema
- `GET /api/fecha-hora` - Fecha y hora del servidor

### Servicio Receptor
- `POST /grabar_archivos_firmados` - Recibir documentos firmados
- `GET /health` - Verificación de estado

## 🧪 Pruebas de Integración

### Estado de las Pruebas

| Servicio | Estado | URL | Resultado |
|----------|--------|-----|-----------|
| JBoss EAP 8.0 | ✅ Activo | http://localhost:8080 | Servidor ejecutándose |
| PostgreSQL | ✅ Activo | localhost:5432 | Base de datos operativa |
| FirmaEC API | ✅ Funcional | /api/version | Responde correctamente |
| FirmaEC Servicio | ✅ Funcional | /servicio/documentos | Token JWT generado |
| Servicio Receptor | ✅ Activo | http://localhost:3000 | Servicio ejecutándose correctamente |

### Paso a Paso para Probar los Servicios

#### 1. Verificar que JBoss esté ejecutándose
```bash
curl -I http://localhost:8080
# Debe responder: HTTP/1.1 200 OK
```

#### 2. Probar API de versión
```bash
curl -X POST http://localhost:8080/api/version
# Respuesta esperada: Error controlado (400 Bad Request)
```

#### 3. Generar API Key para pruebas
```powershell
# En PowerShell (Windows)
$API_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "API-KEY: $API_KEY"
$API_KEY_HASH = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($API_KEY))).Replace("-", "").ToLower()
Write-Host "HASH-SHA256: $API_KEY_HASH"
```

#### 4. Insertar API Key en base de datos
```bash
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "
INSERT INTO sistema(nombre, url, apikey, descripcion)
VALUES ('pruebas', 'http://localhost/pruebas', '$API_KEY_HASH', 'Sistema de pruebas');"
```

#### 5. Crear documento PDF de prueba
```bash
# Crear archivo PDF válido
echo "%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hola Mundo - Documento de prueba) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
418
%%EOF" > test.pdf
```

#### 6. Convertir PDF a Base64
```bash
# En Windows con certutil
certutil -encode test.pdf test.b64

# Extraer Base64 limpio (sin headers)
powershell -Command "$base64 = Get-Content -Path 'test.b64' -Raw; $base64 = $base64 -replace '-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s', ''; Write-Host $base64"
```

#### 7. Probar creación de documentos
```bash
curl -X POST http://localhost:8080/servicio/documentos \
  -H "X-API-KEY: TU_API_KEY_GENERADO" \
  -H "Content-Type: application/json" \
  -d '{
    "sistema": "pruebas",
    "cedula": "171057635",
    "documentos": [{
      "nombre": "test.pdf",
      "documento": "BASE64_DEL_PDF_GENERADO"
    }]
  }'
# Respuesta esperada: Token JWT
```

#### 8. Verificar token JWT
```bash
# Decodificar token en https://jwt.io o con jwt-cli
# Debe contener: cedula, sistema, ids, exp
```

#### 9. Iniciar servicio receptor
```bash
cd servicio-receptor
npm install
npm start
# Servicio ejecutándose en http://localhost:3000
```

#### 10. Probar servicio receptor
```bash
curl http://localhost:3000/health
# Respuesta esperada: {"status":"OK","message":"Servicio receptor operativo"}
```

#### 11. Simular envío de documento firmado al receptor
```bash
curl -X POST http://localhost:3000/grabar_archivos_firmados \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "171057635",
    "nombreDocumento": "test.pdf",
    "archivo": "BASE64_DEL_PDF_FIRMADO",
    "firmasValidas": true,
    "integridadDocumento": true,
    "error": null,
    "certificado": "certificado_base64"
  }'
# Respuesta esperada: {"status":"OK","message":"Documento recibido correctamente"}
```

#### 12. Verificar documento recibido
```bash
# Verificar archivo guardado
dir servicio-receptor\documentos_firmados\
# Debe mostrar: 171057635_test.pdf

# Abrir PDF para verificar
start servicio-receptor\documentos_firmados\171057635_test.pdf
```

#### 13. Verificar base de datos
```bash
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "SELECT * FROM sistema;"
# Debe mostrar el registro insertado
```

### Prueba con Firma Electrónica Real

Para probar con firma electrónica real, se requiere un certificado digital válido emitido por una Autoridad de Certificación reconocida (ej. ANF AC Ecuador). El proceso completo incluye:

#### 1. Preparar Certificado Digital
- Obtener certificado digital en formato PKCS#12 (.p12)
- Extraer clave privada y certificado público
- Configurar keystore Java si es necesario

#### 2. Firmar Documento Digitalmente
```bash
# Usar herramienta de firma digital (ejemplo con OpenSSL)
openssl smime -sign -in test.pdf -out test_firmado.pdf \
  -signer certificado.pem -inkey clave_privada.pem \
  -certfile cadena_certificados.pem -outform DER
```

#### 3. Convertir Documento Firmado a Base64
```bash
# Convertir documento firmado a Base64
certutil -encode test_firmado.pdf test_firmado.b64
# Extraer Base64 limpio
powershell -Command "$base64 = Get-Content -Path 'test_firmado.b64' -Raw; $base64 = $base64 -replace '-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s', ''; Write-Host $base64"
```

#### 4. Enviar Documento Firmado al Servicio Receptor
```bash
curl -X POST http://localhost:3000/grabar_archivos_firmados \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "171057635",
    "nombreDocumento": "test_firmado.pdf",
    "archivo": "BASE64_DEL_DOCUMENTO_FIRMADO",
    "firmasValidas": true,
    "integridadDocumento": true,
    "error": null,
    "certificado": "CERTIFICADO_EN_BASE64"
  }'
```

#### 5. Verificar Firma Digital
- El servicio receptor debe validar la firma digital
- Verificar integridad del documento
- Confirmar certificado válido y no revocado
- Almacenar documento con metadatos de firma

#### 6. Validación en Producción
- Usar servicios de validación de FirmaEC
- Verificar contra listas de revocación (CRL/OCSP)
- Confirmar cumplimiento normativo (Ley Comercio Electrónico, Decreto 981)

### Resultados de Pruebas Ejecutadas

#### ✅ Creación de Documentos
- **Endpoint**: `POST /servicio/documentos`
- **API Key**: Validado correctamente
- **Base64**: Decodificado exitosamente
- **JWT**: Token generado con HS512
- **Payload**: Contiene cédula, sistema e IDs

#### ✅ Validación de API Key
- Sistema "pruebas" reconocido
- Hash SHA256 validado
- Base de datos consultada correctamente

#### ✅ Generación de Token JWT
- Algoritmo: HS512
- Contenido: `{"cedula":"171057635","sistema":"pruebas","ids":"1","exp":1760583286}`
- Token válido y decodificable

#### ⚠️ Servicio Receptor
- Código implementado y funcional
- Requiere ejecución manual: `npm start`
- Endpoint `/grabar_archivos_firmados` listo para recibir documentos firmados

## 🔒 Seguridad

- ✅ Autenticación basada en API Keys
- ✅ Comunicación HTTPS obligatoria en producción
- ✅ Validación de certificados digitales
- ✅ Firma electrónica con estándares X.509
- ✅ Integridad de documentos mediante hashes

## 🏛️ Cumplimiento Normativo

Este proyecto cumple con:

- **Ley de Comercio Electrónico**: Firma electrónica con validez jurídica
- **Decreto Ejecutivo 981**: Gobierno electrónico
- **Acuerdo Ministerial 017-2020**: Sistema oficial de validación
- **Estándares Internacionales**: X.509, PKCS#12, JWT

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia GPL v3. Ver [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Cristhian Cabezas.** - *Implementación y documentación* - [GitHub](https://github.com/cristhianc9)
- **Ministerio de Telecomunicaciones** - *Sistema FirmaEC original*

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/cristhianc9/firmaec-decentralizada/issues)
- **Email**: servicios@gobiernoelectronico.gob.ec
- **Administrador Institucional**: AIF designado por la institución

## 🔄 Registro en Producción

Para usar FirmaEC en producción:

1. Completar implementación y pruebas
2. Solicitar registro vía email a servicios@gobiernoelectronico.gob.ec
3. Adjuntar:
   - URL del servicio web API
   - Informe de pruebas
   - Delegación del Administrador Institucional de FirmaEC

---

**⚠️ Importante**: Este repositorio contiene únicamente la configuración y documentación. Los proyectos fuente de FirmaEC deben obtenerse del repositorio oficial de Minka.
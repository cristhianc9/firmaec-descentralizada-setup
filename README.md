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
| Servicio Receptor | ⏳ Pendiente | http://localhost:3000 | Requiere iniciar manualmente |

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

#### 5. Crear documento de prueba en Base64
```bash
# Crear archivo de prueba
echo "Hola Mundo - Documento de prueba" > test.txt

# Convertir a Base64
base64 test.txt
# Resultado: SG9sYSBNdW5kbyAtIERvY3VtZW50byBkZSBwcnVlYmE=
```

#### 6. Probar creación de documentos
```bash
curl -X POST http://localhost:8080/servicio/documentos \
  -H "X-API-KEY: TU_API_KEY_GENERADO" \
  -H "Content-Type: application/json" \
  -d '{
    "sistema": "pruebas",
    "cedula": "171057635",
    "documentos": [{
      "nombre": "test.txt",
      "documento": "SG9sYSBNdW5kbyAtIERvY3VtZW50byBkZSBwcnVlYmE="
    }]
  }'
# Respuesta esperada: Token JWT
```

#### 7. Verificar token JWT
```bash
# Decodificar token en https://jwt.io o con jwt-cli
# Debe contener: cedula, sistema, ids, exp
```

#### 8. Iniciar servicio receptor
```bash
cd servicio-receptor
npm install
npm start
# Servicio ejecutándose en http://localhost:3000
```

#### 9. Probar servicio receptor
```bash
curl http://localhost:3000/health
# Respuesta esperada: {"status":"OK","message":"Servicio receptor operativo"}
```

#### 10. Verificar base de datos
```bash
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "SELECT * FROM sistema;"
# Debe mostrar el registro insertado
```

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

- **Cristian C.** - *Implementación y documentación* - [GitHub](https://github.com/cristhianc9)
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
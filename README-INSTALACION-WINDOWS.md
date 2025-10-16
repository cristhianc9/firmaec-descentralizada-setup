# Guía de Instalación y Configuración - FirmaEC Descentralizada

Esta guía proporciona los pasos detallados para configurar el ambiente de desarrollo de FirmaEC Descentralizada en Windows usando Podman/Docker, JBoss EAP 8.0, PostgreSQL y JDK 21.

## Requisitos Previos

### Software Requerido
- **Sistema Operativo**: Windows 10/11 (64-bit)
- **JDK**: OpenJDK 21+ (descargar de https://adoptium.net/)
- **Maven**: Apache Maven 3.9+ (descargar de https://maven.apache.org/download.cgi)
- **Podman/Docker**: Para contenedores PostgreSQL
- **JBoss EAP**: 8.0 (descargar de https://developers.redhat.com/products/eap/download)
- **Git**: Para clonar repositorios

### Variables de Entorno
Asegurarse de que estén configuradas:
```cmd
JAVA_HOME=C:\ruta\a\jdk-21
MAVEN_HOME=C:\ruta\a\maven
PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%
```

## Paso 1: Clonar y Compilar Proyectos

### 1.1 Clonar Repositorios
```cmd
mkdir firmaec-dev
cd firmaec-dev
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-libreria.git
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-api.git
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-servicio.git
```

### 1.2 Compilar Librería (Dependencia)
```cmd
cd firmadigital-libreria
mvn clean package
```

### 1.3 Compilar API
```cmd
cd ../firmadigital-api
mvn clean package
```

### 1.4 Compilar Servicio
```cmd
cd ../firmadigital-servicio
mvn clean package
```

## Paso 2: Configurar Base de Datos PostgreSQL

### 2.1 Iniciar Contenedor PostgreSQL
```cmd
podman run -d --name postgresql_firmadigital ^
  -e POSTGRESQL_USER=firmadigital ^
  -e POSTGRESQL_PASSWORD=firmadigital ^
  -e POSTGRESQL_DATABASE=firmadigital ^
  -p 5432:5432 ^
  docker.io/centos/postgresql-96-centos7
```

### 2.2 Generar API Key
```powershell
$API_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "API-KEY: $API_KEY"
$API_KEY_HASH = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($API_KEY))).Replace("-", "").ToLower()
Write-Host "HASH-SHA256: $API_KEY_HASH"
```

### 2.3 Crear Tabla y Insertar Registro
```cmd
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "
CREATE TABLE IF NOT EXISTS sistema (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion VARCHAR(255),
    url VARCHAR(255),
    apikey VARCHAR(255),
    apikeyrest VARCHAR(255)
);"

podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "
INSERT INTO sistema(nombre, url, apikey, descripcion)
VALUES ('pruebas', 'http://localhost/pruebas', '$API_KEY_HASH', 'Sistema de pruebas');"
```

## Paso 3: Configurar JBoss EAP 8.0

### 3.1 Crear Usuario Administrador
```cmd
cd C:\ruta\a\jboss-eap-8.0\bin
add-user.bat
```
- Tipo: `a` (Management User)
- Usuario: `admin`
- Contraseña: `admin123!`
- Grupo: (vacío)

### 3.2 Configurar Módulo PostgreSQL
```cmd
jboss-cli.bat --connect --command="
module add --name=org.postgresql --resources=C:\ruta\a\postgresql-42.7.3.jar --dependencies=javax.api,javax.transaction.api
"
```

### 3.3 Configurar Driver JDBC
```cmd
jboss-cli.bat --connect --command="
/subsystem=datasources/jdbc-driver=postgresql:add(driver-name=postgresql,driver-module-name=org.postgresql,driver-xa-datasource-class-name=org.postgresql.xa.PGXADataSource)
"
```

### 3.4 Configurar DataSource
```cmd
jboss-cli.bat --connect --command="
data-source add --name=FirmaDigitalDS --jndi-name=java:/FirmaDigitalDS --driver-name=postgresql --connection-url=jdbc:postgresql://localhost:5432/firmadigital --user-name=firmadigital --password=firmadigital --valid-connection-checker-class-name=org.jboss.jca.adapters.jdbc.extensions.postgres.PostgreSQLValidConnectionChecker --exception-sorter-class-name=org.jboss.jca.adapters.jdbc.extensions.postgres.PostgreSQLExceptionSorter
"
```

### 3.5 Configurar Variable Global
```cmd
jboss-cli.bat --connect --command="
/system-property=firmadigital-servicio.url:add(value=\"http://localhost:8080/servicio\")
"
```

### 3.6 Configurar SSL (Opcional para Desarrollo)
```cmd
# Generar keystore
keytool -genkeypair -alias localhost -keyalg RSA -keysize 2048 -validity 365 -keystore C:\ruta\a\jboss-eap-8.0\standalone\configuration\keystore.jks -dname "CN=localhost, OU=Development, O=FirmaEC, L=Quito, ST=Pichincha, C=EC" -storepass password -keypass password

# Configurar en JBoss CLI
jboss-cli.bat --connect --command="
/subsystem=elytron/key-store=keystore:add(path=keystore.jks, relative-to=jboss.server.config.dir, credential-reference={clear-text=password}, type=JKS)
/subsystem=elytron/key-manager=keymanager:add(key-store=keystore, credential-reference={clear-text=password})
/subsystem=elytron/server-ssl-context=sslcontext:add(key-manager=keymanager, protocols=[\"TLSv1.2\",\"TLSv1.3\"])
/subsystem=undertow/server=default-server/https-listener=https:add(socket-binding=https, ssl-context=sslcontext, enable-http2=true)
"
```

## Paso 4: Desplegar Aplicaciones

### 4.1 Copiar WARs
```cmd
copy firmaec-dev\firmadigital-api\target\api.war C:\ruta\a\jboss-eap-8.0\standalone\deployments\
copy firmaec-dev\firmadigital-servicio\target\servicio.war C:\ruta\a\jboss-eap-8.0\standalone\deployments\
```

### 4.2 Iniciar JBoss
```cmd
cd C:\ruta\a\jboss-eap-8.0\bin
standalone.bat
```

## Paso 5: Configurar Servicio Receptor (Opcional)

### 5.1 Crear Servicio REST Receptor
Crear carpeta `servicio-receptor` y archivos:
- `servicio-receptor.js`
- `package.json`

### 5.2 Instalar Dependencias y Ejecutar
```cmd
cd servicio-receptor
npm install
npm start
```

## Paso 6: Verificación

### 6.1 Verificar Despliegues
- API: http://localhost:8080/api/
- Servicio: http://localhost:8080/servicio/
- SSL (si configurado): https://localhost:8443/

### 6.2 Verificar Base de Datos
```cmd
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "SELECT * FROM sistema;"
```

### 6.3 Verificar Consola JBoss
- URL: http://localhost:9990
- Usuario: admin
- Contraseña: admin123!

## URLs de Servicios

- **API**: http://localhost:8080/api/
- **Servicio**: http://localhost:8080/servicio/
- **Servicio Receptor**: http://localhost:3000/grabar_archivos_firmados
- **Consola JBoss**: http://localhost:9990

## Solución de Problemas

### Error de CRL
Si aparece error de descarga CRL, es normal en desarrollo. Para producción, configurar certificados válidos.

### Puerto Ocupado
Si el puerto 5432 está ocupado:
```cmd
podman stop postgresql_firmadigital
podman rm postgresql_firmadigital
```

### Reinicio Completo
Para reiniciar todo:
```cmd
podman stop postgresql_firmadigital
# Cerrar JBoss (Ctrl+C)
# Repetir pasos de inicio
```

## Notas de Producción

- Usar certificados SSL válidos (no autofirmados)
- Configurar firewall y seguridad
- Usar HTTPS obligatorio
- Monitorear logs de JBoss y aplicación
- Backup regular de base de datos

## Soporte

Para soporte técnico, contactar al Administrador Institucional de FirmaEC (AIF) o Gobierno Electrónico.
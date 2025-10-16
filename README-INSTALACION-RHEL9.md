# Guía de Instalación y Configuración - FirmaEC Descentralizada (RHEL 9)

Esta guía proporciona los pasos detallados para configurar el ambiente de desarrollo de FirmaEC Descentralizada en Red Hat Enterprise Linux 9 usando Podman, JBoss EAP 8.0, PostgreSQL y JDK 21.

## Requisitos Previos

### Software Requerido
- **Sistema Operativo**: Red Hat Enterprise Linux 9 (x86_64)
- **JDK**: OpenJDK 21+ (desde repositorios RHEL)
- **Maven**: Apache Maven 3.9+ (desde repositorios RHEL)
- **Podman**: Para contenedores (incluido en RHEL 9)
- **JBoss EAP**: 8.0 (descargar de Red Hat)
- **Git**: Para clonar repositorios

### Instalación de Dependencias
```bash
# Actualizar sistema
sudo dnf update -y

# Instalar JDK 21
sudo dnf install -y java-21-openjdk-devel

# Instalar Maven
sudo dnf install -y maven

# Instalar Podman
sudo dnf install -y podman

# Instalar Git
sudo dnf install -y git

# Instalar utilidades
sudo dnf install -y wget curl unzip
```

### Variables de Entorno
Agregar al archivo `~/.bashrc`:
```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export MAVEN_HOME=/usr/share/maven
export PATH=$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH
```

Recargar variables:
```bash
source ~/.bashrc
```

## Paso 1: Clonar y Compilar Proyectos

### 1.1 Clonar Repositorios
```bash
mkdir firmaec-dev
cd firmaec-dev
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-libreria.git
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-api.git
git clone https://minka.gob.ec/mintel/ge/firmaec/firmadigital-servicio.git
```

### 1.2 Compilar Librería (Dependencia)
```bash
cd firmadigital-libreria
mvn clean package
```

### 1.3 Compilar API
```bash
cd ../firmadigital-api
mvn clean package
```

### 1.4 Compilar Servicio
```bash
cd ../firmadigital-servicio
mvn clean package
```

## Paso 2: Configurar Base de Datos PostgreSQL

### 2.1 Descargar Driver PostgreSQL
```bash
cd ~
wget https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.3/postgresql-42.7.3.jar
```

### 2.2 Iniciar Contenedor PostgreSQL
```bash
podman run -d --name postgresql_firmadigital \
  -e POSTGRESQL_USER=firmadigital \
  -e POSTGRESQL_PASSWORD=firmadigital \
  -e POSTGRESQL_DATABASE=firmadigital \
  -p 5432:5432 \
  docker.io/centos/postgresql-96-centos7
```

### 2.3 Generar API Key
```bash
# Generar API KEY aleatorio
API_KEY=$(pwgen 32 1)
echo "API-KEY: $API_KEY"

# Calcular hash SHA256
API_KEY_HASH=$(echo -n $API_KEY | sha256sum | cut -d' ' -f1)
echo "HASH-SHA256: $API_KEY_HASH"
```

### 2.4 Crear Tabla y Insertar Registro
```bash
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

### 3.1 Instalar JBoss EAP
```bash
# Descomprimir JBoss (asumiendo que ya está descargado)
cd /opt
sudo unzip ~/jboss-eap-8.0.0.zip
sudo ln -s jboss-eap-8.0 jboss-eap
sudo chown -R $(whoami):$(whoami) /opt/jboss-eap-8.0
```

### 3.2 Crear Usuario Administrador
```bash
cd /opt/jboss-eap/bin
./add-user.sh
```
- Tipo: `a` (Management User)
- Usuario: `admin`
- Contraseña: `admin123!`
- Grupo: (vacío)

### 3.3 Configurar Módulo PostgreSQL
```bash
./jboss-cli.sh --connect --command="
module add --name=org.postgresql --resources=/home/$(whoami)/postgresql-42.7.3.jar --dependencies=javax.api,javax.transaction.api
"
```

### 3.4 Configurar Driver JDBC
```bash
./jboss-cli.sh --connect --command="
/subsystem=datasources/jdbc-driver=postgresql:add(driver-name=postgresql,driver-module-name=org.postgresql,driver-xa-datasource-class-name=org.postgresql.xa.PGXADataSource)
"
```

### 3.5 Configurar DataSource
```bash
./jboss-cli.sh --connect --command="
data-source add --name=FirmaDigitalDS --jndi-name=java:/FirmaDigitalDS --driver-name=postgresql --connection-url=jdbc:postgresql://localhost:5432/firmadigital --user-name=firmadigital --password=firmadigital --valid-connection-checker-class-name=org.jboss.jca.adapters.jdbc.extensions.postgres.PostgreSQLValidConnectionChecker --exception-sorter-class-name=org.jboss.jca.adapters.jdbc.extensions.postgres.PostgreSQLExceptionSorter
"
```

### 3.6 Configurar Variable Global
```bash
./jboss-cli.sh --connect --command="
/system-property=firmadigital-servicio.url:add(value=\"http://localhost:8080/servicio\")
"
```

### 3.7 Configurar SSL (Opcional para Desarrollo)
```bash
# Generar keystore
keytool -genkeypair -alias localhost -keyalg RSA -keysize 2048 -validity 365 \
  -keystore /opt/jboss-eap/standalone/configuration/keystore.jks \
  -dname "CN=localhost, OU=Development, O=FirmaEC, L=Quito, ST=Pichincha, C=EC" \
  -storepass password -keypass password

# Configurar en JBoss CLI
./jboss-cli.sh --connect --command="
/subsystem=elytron/key-store=keystore:add(path=keystore.jks, relative-to=jboss.server.config.dir, credential-reference={clear-text=password}, type=JKS)
/subsystem=elytron/key-manager=keymanager:add(key-store=keystore, credential-reference={clear-text=password})
/subsystem=elytron/server-ssl-context=sslcontext:add(key-manager=keymanager, protocols=[\"TLSv1.2\",\"TLSv1.3\"])
/subsystem=undertow/server=default-server/https-listener=https:add(socket-binding=https, ssl-context=sslcontext, enable-http2=true)
"
```

## Paso 4: Desplegar Aplicaciones

### 4.1 Copiar WARs
```bash
cp ~/firmaec-dev/firmadigital-api/target/api.war /opt/jboss-eap/standalone/deployments/
cp ~/firmaec-dev/firmadigital-servicio/target/servicio.war /opt/jboss-eap/standalone/deployments/
```

### 4.2 Configurar Firewall
```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --permanent --add-port=9990/tcp
sudo firewall-cmd --reload
```

### 4.3 Iniciar JBoss
```bash
cd /opt/jboss-eap/bin
./standalone.sh
```

## Paso 5: Configurar Servicio Receptor (Opcional)

### 5.1 Instalar Node.js
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs
```

### 5.2 Crear Servicio REST Receptor
```bash
cd ~
mkdir servicio-receptor
cd servicio-receptor

# Crear package.json
cat > package.json << 'EOF'
{
  "name": "firmaec-receptor",
  "version": "1.0.0",
  "description": "Servicio REST receptor de documentos firmados para FirmaEC",
  "main": "servicio-receptor.js",
  "scripts": {
    "start": "node servicio-receptor.js",
    "dev": "nodemon servicio-receptor.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# Crear servicio-receptor.js (contenido del archivo anterior)
# ... (copiar contenido del archivo servicio-receptor.js)

npm install
npm start
```

## Paso 6: Verificación

### 6.1 Verificar Despliegues
```bash
curl http://localhost:8080/api/
curl http://localhost:8080/servicio/
```

### 6.2 Verificar Base de Datos
```bash
podman exec -it postgresql_firmadigital psql -U firmadigital -d firmadigital -c "SELECT * FROM sistema;"
```

### 6.3 Verificar Consola JBoss
- URL: http://localhost:9990
- Usuario: admin
- Contraseña: admin123!

## Paso 7: Configurar Servicio como Systemd (Producción)

### 7.1 Crear Servicio para JBoss
```bash
sudo tee /etc/systemd/system/jboss-eap.service > /dev/null <<EOF
[Unit]
Description=JBoss EAP 8.0
After=network.target

[Service]
Type=simple
User=$(whoami)
Environment=JAVA_HOME=/usr/lib/jvm/java-21-openjdk
Environment=JBOSS_HOME=/opt/jboss-eap
ExecStart=/opt/jboss-eap/bin/standalone.sh
ExecStop=/opt/jboss-eap/bin/jboss-cli.sh --connect command=:shutdown
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable jboss-eap
sudo systemctl start jboss-eap
```

### 7.2 Crear Servicio para Receptor
```bash
sudo tee /etc/systemd/system/firmaec-receptor.service > /dev/null <<EOF
[Unit]
Description=FirmaEC Receptor Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/home/$(whoami)/servicio-receptor
ExecStart=/usr/bin/node servicio-receptor.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable firmaec-receptor
sudo systemctl start firmaec-receptor
```

## URLs de Servicios

- **API**: http://localhost:8080/api/
- **Servicio**: http://localhost:8080/servicio/
- **Servicio Receptor**: http://localhost:3000/grabar_archivos_firmados
- **Consola JBoss**: http://localhost:9990

## Solución de Problemas

### Error de CRL
```bash
# Para desarrollo, ignorar validaciones CRL
# En producción, configurar certificados válidos
```

### Puerto Ocupado
```bash
# Verificar procesos usando puertos
sudo netstat -tulpn | grep :5432
podman stop postgresql_firmadigital
podman rm postgresql_firmadigital
```

### SELinux
```bash
# Si hay problemas con SELinux
sudo setsebool -P httpd_can_network_connect 1
```

### Logs
```bash
# Ver logs de JBoss
tail -f /opt/jboss-eap/standalone/log/server.log

# Ver logs de servicios
journalctl -u jboss-eap -f
journalctl -u firmaec-receptor -f
```

## Notas de Producción

- Configurar SELinux correctamente
- Usar certificados SSL válidos (Let's Encrypt o CA)
- Configurar logrotate para logs
- Monitoreo con Prometheus/Grafana
- Backup automático de base de datos
- Configurar firewall restrictivo

## Soporte

Para soporte técnico, contactar al Administrador Institucional de FirmaEC (AIF) o Gobierno Electrónico.
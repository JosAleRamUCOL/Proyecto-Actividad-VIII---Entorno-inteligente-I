// --- Variables globales ---
let client = null;
let stats = {
    tempMin: null,
    tempMax: null,
    pressMin: null,
    pressMax: null,
    messageCount: 0
};

// --- Referencias DOM ---
const connectionStatus = document.getElementById('connectionStatus');
const topicInput = document.getElementById('topicInput');
const connectBtn = document.getElementById('connectBtn');
const temperatureValue = document.getElementById('temperatureValue');
const pressureValue = document.getElementById('pressureValue');
const tempTimestamp = document.getElementById('tempTimestamp');
const pressTimestamp = document.getElementById('pressTimestamp');
const messageLog = document.getElementById('messageLog');
const clearLogBtn = document.getElementById('clearLogBtn');

// URL del Broker MQTT
const brokerUrl = 'ws://test.mosquitto.org:8080';

// --- Event Listeners ---
connectBtn.addEventListener('click', toggleConnection);
clearLogBtn.addEventListener('click', clearLog);

// --- Funciones MQTT ---
function toggleConnection() {
    if (client && client.connected) {
        disconnectMQTT();
    } else {
        connectMQTT();
    }
}

function connectMQTT() {
    const topic = topicInput.value.trim();
    if (!topic) {
        alert('Por favor ingresa un tema MQTT válido');
        return;
    }

    const clientId = 'mqtt_monitor_' + Math.random().toString(16).substr(2, 8);
    const options = {
        clientId: clientId,
        keepalive: 60,
        reconnectPeriod: 1000,
    };

    connectionStatus.textContent = '● Conectando...';
    connectionStatus.className = 'status-connecting';
            
    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        connectionStatus.textContent = '● Conectado';
        connectionStatus.className = 'status-connected';
        connectBtn.textContent = 'Desconectar';
        connectBtn.classList.add('btn-disconnect');
                
        // Suscribirse al topic
        client.subscribe(topic, (err) => {
            if (err) {
                console.error('Error al suscribirse:', err);
                addLogMessage('Error al suscribirse al tema: ' + topic, 'error');
            } else {
                console.log('Suscrito a:', topic);
                addLogMessage('Suscrito exitosamente al tema: ' + topic, 'success');
            }
        });
    });

    client.on('message', (topic, message) => {
        handleMessage(message.toString());
    });

    client.on('close', () => {
        connectionStatus.textContent = '● Desconectado';
        connectionStatus.className = 'status-disconnected';
        connectBtn.textContent = 'Conectar al Broker';
        connectBtn.classList.remove('btn-disconnect');
    });

    client.on('error', (err) => {
        console.error('Error de conexión MQTT:', err);
        connectionStatus.textContent = '● Error de conexión';
        connectionStatus.className = 'status-error';
        addLogMessage('Error de conexión: ' + err.message, 'error');
    });
}

function disconnectMQTT() {
    if (client) {
        client.end();
        addLogMessage('Desconectado del broker', 'info');
    }
}

// --- Manejo de mensajes ---
function handleMessage(message) {
    try {
        const data = JSON.parse(message);
        const timestamp = new Date().toLocaleTimeString('es-MX');
                
        // Actualizar temperatura
        if (data.temperature !== undefined) {
            const temp = parseFloat(data.temperature);
            temperatureValue.textContent = temp.toFixed(2);
            tempTimestamp.textContent = timestamp;
            updateStats('temp', temp);
        }
                
        // Actualizar presión
        if (data.pressure !== undefined) {
            const press = parseFloat(data.pressure);
            pressureValue.textContent = press.toFixed(2);
            pressTimestamp.textContent = timestamp;
            updateStats('press', press);
        }
                
        // Incrementar contador
        stats.messageCount++;
        document.getElementById('messageCount').textContent = stats.messageCount;
        document.getElementById('lastUpdate').textContent = timestamp;
        
        // Agregar al log
        addLogMessage(`Temp: ${data.temperature}°C, Presión: ${data.pressure}hPa`, 'data');
                
    } catch (e) {
        console.error('Error al parsear mensaje:', e);
        addLogMessage('Mensaje recibido (formato inválido): ' + message, 'warning');
    }
}

// --- Actualización de estadísticas ---
function updateStats(type, value) {
    if (type === 'temp') {
        if (stats.tempMin === null || value < stats.tempMin) {
            stats.tempMin = value;
            document.getElementById('tempMin').textContent = value.toFixed(2) + '°C';
        }
        if (stats.tempMax === null || value > stats.tempMax) {
            stats.tempMax = value;
            document.getElementById('tempMax').textContent = value.toFixed(2) + '°C';
        }
    } else if (type === 'press') {
        if (stats.pressMin === null || value < stats.pressMin) {
            stats.pressMin = value;
            document.getElementById('pressMin').textContent = value.toFixed(2) + 'hPa';
        }
        if (stats.pressMax === null || value > stats.pressMax) {
            stats.pressMax = value;
            document.getElementById('pressMax').textContent = value.toFixed(2) + 'hPa';
        }
    }
}

// --- Log de mensajes ---
function addLogMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('es-MX');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
    
    messageLog.insertBefore(logEntry, messageLog.firstChild);
    
    // Limitar a 50 mensajes
    if (messageLog.children.length > 50) {
        messageLog.removeChild(messageLog.lastChild);
    }
}

function clearLog() {
    messageLog.innerHTML = '';
    addLogMessage('Log limpiado', 'info');
}
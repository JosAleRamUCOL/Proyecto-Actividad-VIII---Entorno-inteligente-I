// --- Variables globales ---
let stats = {
    tempMin: null,
    tempMax: null,
    pressMin: null,
    pressMax: null,
    messageCount: 0
};
let map = null;
let robotMarker = null;
let autoCenterCheck = true;
let initialCoords = [19.2433, -103.725]; // Coordenadas de Colima (ejemplo)

// --- Referencias DOM ---
const temperatureValue = document.getElementById('temperatureValue');
const pressureValue = document.getElementById('pressureValue');
const tempTimestamp = document.getElementById('tempTimestamp');
const pressTimestamp = document.getElementById('pressTimestamp');
const messageLog = document.getElementById('messageLog');
const clearLogBtn = document.getElementById('clearLogBtn');
const autoCenterElement = document.getElementById('autoCenterCheck');

// --- Event Listeners ---
clearLogBtn.addEventListener('click', clearLog);
autoCenterElement.addEventListener('change', (e) => {
    autoCenterCheck = e.target.checked;
});

// --- Conexión Socket.IO ---
const socket = io();

socket.on('connect', () => {
    console.log('✅ Conectado al servidor vía WebSocket');
    addLogMessage('Conectado al servidor', 'success');
});

socket.on('disconnect', () => {
    console.warn('🛑 Desectado del servidor WebSocket');
    addLogMessage('Desconectado del servidor', 'error');
});

// --- Escuchar el evento 'newData' del servidor ---
socket.on('newData', (data) => {
    handleNewData(data);
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
});

// --- Lógica del Mapa ---
function initializeMap() {
    map = L.map('map').setView(initialCoords, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    addLogMessage('Mapa inicializado', 'info');
}

function updateMap(lat, lng) {
    if (lat === null || lng === null || lat === 0 || lng === 0) {
        return; // Ignorar coordenadas nulas o (0,0)
    }

    const newPosition = [lat, lng];

    if (!robotMarker) {
        // Crear el marcador si no existe
        robotMarker = L.marker(newPosition).addTo(map);
        robotMarker.bindPopup("Posición actual del Robot").openPopup();
        addLogMessage(`Posición inicial del robot: ${lat}, ${lng}`, 'data');
    } else {
        // Mover el marcador existente
        robotMarker.setLatLng(newPosition);
    }

    // Centrar el mapa si la opción está activa
    if (autoCenterCheck) {
        map.setView(newPosition, 16); // Centra y ajusta el zoom
    }
}

// --- Manejo de datos ---
function handleNewData(data) {
    try {
        const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString('es-MX');

        // 1. Actualizar Temperatura
        if (data.temperature !== undefined) {
            const temp = parseFloat(data.temperature);
            temperatureValue.textContent = temp.toFixed(2);
            tempTimestamp.textContent = timestamp;
            updateStats('temp', temp);
        }

        // 2. Actualizar Presión
        if (data.pressure !== undefined) {
            const press = parseFloat(data.pressure);
            pressureValue.textContent = press.toFixed(2);
            pressTimestamp.textContent = timestamp;
            updateStats('press', press);
        }

        // 3. Actualizar Mapa
        if (data.lat !== undefined && data.lng !== undefined) {
            updateMap(parseFloat(data.lat), parseFloat(data.lng));
        }

        // 4. Actualizar Estadísticas y Log
        stats.messageCount++;
        document.getElementById('messageCount').textContent = stats.messageCount;
        document.getElementById('lastUpdate').textContent = timestamp;

        // Agregar al log
        const logMsg = `Temp: ${data.temperature}°C, Presión: ${data.pressure}hPa, GPS: ${data.lat}, ${data.lng}`;
        addLogMessage(logMsg, 'data');

    } catch (e) {
        console.error('Error al procesar datos:', e);
        addLogMessage('Datos recibidos (formato inválido)', 'warning');
    }
}

// --- Actualización de estadísticas (Sin cambios) ---
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

// --- Log de mensajes (Sin cambios) ---
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
// --- Lógica de pestañas ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remover clase active de todas las pestañas y contenidos
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
        // Agregar clase active a la pestaña clickeada y su contenido
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        if (tabId === 'map-tab' && map) {
            setTimeout(function() {
                map.invalidateSize();
            }, 100);
        }
    });
});

// --- Lógica MQTT ---
let client = null;
const connectionStatus = document.getElementById('connectionStatus');
const topicInput = document.getElementById('topicInput');
const connectBtn = document.getElementById('connectBtn');

// URL del Broker MQTT (usando WebSockets, puerto 8080)
const brokerUrl = 'ws://test.mosquitto.org:8080';

connectBtn.addEventListener('click', connectMQTT);

function connectMQTT() {
    if (client && client.connected) {
        client.end(); // Desconectar si ya está conectado
    }

    const clientId = 'mqtt_js_' + Math.random().toString(16).substr(2, 8);
    const options = {
        clientId: clientId,
        keepalive: 60,
        reconnectPeriod: 1000,
    };

    connectionStatus.textContent = '● Conectando...';
    connectionStatus.className = 'status-connecting';
            
    // Conectar al broker
    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        connectionStatus.textContent = '● Conectado';
        connectionStatus.className = 'status-connected';
        console.log('Conectado al broker MQTT');
    });

    client.on('close', () => {
        connectionStatus.textContent = '● Desconectado';
        connectionStatus.className = 'status-disconnected';
        console.log('Desconectado del broker MQTT');
    });

    client.on('error', (err) => {
        console.error('Error de conexión MQTT:', err);
        connectionStatus.textContent = '● Error de conexión';
        connectionStatus.className = 'status-error';
        client.end();
    });
}

// Función para publicar mensajes
function publishMessage(message, topic) {
    if (client && client.connected) {
        const publishTopic = topic || topicInput.value;
        if (!publishTopic) {
            alert('Por favor ingresa un Tema MQTT');
            return;
        }
        client.publish(publishTopic, JSON.stringify(message), { qos: 0, retain: false });
        console.log('Mensaje enviado:', message, 'al tópico:', publishTopic);
    } else {
        console.warn('No estás conectado al broker MQTT. Mensaje no enviado.');
    }
}

// --- Lógica del Joystick ---
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
let isDragging = false;

joystickKnob.addEventListener('mousedown', startDragging);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDragging);

joystickKnob.addEventListener('touchstart', startDragging);
document.addEventListener('touchmove', drag);
document.addEventListener('touchend', stopDragging);

function startDragging(e) {
    isDragging = true;
    e.preventDefault();
}

function stopDragging() {
    if (isDragging) {
        isDragging = false;
        joystickKnob.style.left = '90px';
        joystickKnob.style.top = '90px';
                
        publishMessage({ "direction": "stop" });
    }
}

function drag(e) {
    if (!isDragging) return;

    const joystickRect = joystick.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (!clientX || !clientY) return;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const maxDistance = 90;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    const limitedX = Math.cos(angle) * Math.min(distance, maxDistance);
    const limitedY = Math.sin(angle) * Math.min(distance, maxDistance);

    joystickKnob.style.left = `${90 + limitedX}px`;
    joystickKnob.style.top = `${90 + limitedY}px`;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) publishMessage({ "direction": "right" });
        else publishMessage({ "direction": "left" });
    } else {
        if (deltaY > 0) publishMessage({ "direction": "down" });
        else publishMessage({ "direction": "up" });
    }
}

// --- Lógica del Mapa Leaflet ---
// Inicializar el mapa
let map = L.map('map').setView([19.2433, -103.725], 14); // Coordenadas de ejemplo (Santa Cruz, Bolivia)

// Añadir capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let selectedMarker = null;
let selectedLatLng = null;

// Crear un marcador inicial
selectedMarker = L.marker([19.2433, -103.725], {
    draggable: true
}).addTo(map);
        
selectedLatLng = { lat: -17.7833, lng: -63.1821 };

// Función para formatear la fecha y hora en GMT
function getGMTDateTime() {
    const now = new Date();
    const gmtTime = now.toUTCString().split(' ')[4]; // HH:MM:SS
    const date = now.toUTCString().split(' ').slice(0, 4).join(' '); // Día, DD MMM YYYY
    return { gmtTime, date };
}

// Función para actualizar la información de ubicación
function updateLocationInfo(lat, lng) {
    document.getElementById('lat').textContent = lat.toFixed(6);
    document.getElementById('lng').textContent = lng.toFixed(6);
            
    const { gmtTime, date } = getGMTDateTime();
    document.getElementById('gmtTime').textContent = gmtTime;
    document.getElementById('date').textContent = date;
            
    // Calcular orientación basada en el movimiento (simulada para el ejemplo)
    // En una implementación real, esto vendría de un sensor
    document.getElementById('orientation').textContent = Math.floor(Math.random() * 360);
}

// Actualizar la información inicial
updateLocationInfo(selectedLatLng.lat, selectedLatLng.lng);

// Evento cuando se arrastra el marcador
selectedMarker.on('dragend', function(event) {
    const marker = event.target;
    const position = marker.getLatLng();
    selectedLatLng = { lat: position.lat, lng: position.lng };
            
    // Actualizar la información
    updateLocationInfo(position.lat, position.lng);
            
    marker.bindPopup('Ubicación seleccionada: ' + position.lat.toFixed(6) + ', ' + position.lng.toFixed(6))
        .openPopup();
});

// Al hacer clic en el mapa (para agregar un nuevo marcador)
map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    selectedLatLng = { lat, lng };
    
    // Si ya hay un marcador, eliminarlo
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }
            
    // Agregar un nuevo marcador
    selectedMarker = L.marker([lat, lng], {
        draggable: true
    }).addTo(map)
        .bindPopup('Ubicación seleccionada: ' + lat.toFixed(6) + ', ' + lng.toFixed(6))
        .openPopup();
            
    // Actualizar la información
    updateLocationInfo(lat, lng);
            
    // Evento cuando se arrastra el nuevo marcador
    selectedMarker.on('dragend', function(event) {
        const marker = event.target;
        const position = marker.getLatLng();
        selectedLatLng = { lat: position.lat, lng: position.lng };
        
        // Actualizar la información
        updateLocationInfo(position.lat, position.lng);
                
        marker.bindPopup('Ubicación seleccionada: ' + position.lat.toFixed(6) + ', ' + position.lng.toFixed(6))
            .openPopup();
    });
});

// Evento para el botón de enviar ubicación
document.getElementById('sendLocation').addEventListener('click', function() {
    if (!selectedLatLng) {
        alert('Por favor, selecciona una ubicación en el mapa.');
        return;
    }
            
    const lat = parseFloat(document.getElementById('lat').textContent);
    const lng = parseFloat(document.getElementById('lng').textContent);
    const gmtTime = document.getElementById('gmtTime').textContent;
    const date = document.getElementById('date').textContent;
    const orientation = parseFloat(document.getElementById('orientation').textContent);
            
    const locationMessage = {
        lat,
        lng,
        gmtTime,
        date,
        orientation
    };
            
    publishMessage(locationMessage, 'carro/control');
            
    // Mostrar confirmación
    alert('Ubicación enviada correctamente al tópico carro/gps');
});

// --- Lógica del Seguimiento de Línea ---
const lineTrackingToggle = document.getElementById('lineTrackingToggle');
const trackingStatus = document.getElementById('trackingStatus');
let lineTrackingActive = false;

lineTrackingToggle.addEventListener('click', function() {
    lineTrackingActive = !lineTrackingActive;
            
    if (lineTrackingActive) {
        lineTrackingToggle.classList.add('active');
        trackingStatus.textContent = 'ACTIVADO';
        trackingStatus.className = 'toggle-status status-on';
                
        publishMessage({ "lineTracking": true });
    } else {
        lineTrackingToggle.classList.remove('active');
        trackingStatus.textContent = 'DESACTIVADO';
        trackingStatus.className = 'toggle-status status-off';
                
        publishMessage({ "lineTracking": false });
    }
            
    console.log('Seguimiento de línea:', lineTrackingActive);
});
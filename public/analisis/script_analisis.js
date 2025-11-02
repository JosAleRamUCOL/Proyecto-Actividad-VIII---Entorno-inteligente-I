// script_analisis.js - Versión actualizada para usar MongoDB

// --- Lógica de pestañas ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// --- Variables globales ---
let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// --- AÑADIR: Conexión por WebSocket (Socket.IO) ---
const socket = io(); // Se conecta automáticamente al servidor

socket.on('connect', () => {
    console.log('✅ Conectado al servidor vía WebSocket');
});

// Escucha el evento 'newData' que el servidor emite
socket.on('newData', (data) => {
    console.log('📬 Nuevos datos recibidos desde el servidor:', data);

    // Opcional: podrías agregar 'data' directamente a 'allData'
    // pero recargar es más simple y asegura consistencia.
    if (currentPage === 1) {
         loadDataFromServer(); // Recarga los datos de la tabla si estás en la pág 1
    }
});

socket.on('disconnect', () => {
    console.log('🛑 Desconectado del servidor WebSocket');
});

// --- Cargar datos desde MongoDB ---
async function loadDataFromServer() {
    try {
        const searchTerm = document.getElementById('searchInput').value;
        const dateFilter = document.getElementById('dateFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        const params = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm
        });

        const response = await fetch(`/api/datacarro?${params}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar datos');
        }

        const result = await response.json();
        
        allData = result.data;
        filteredData = result.data;
        
        renderTable();
        updatePaginationInfo(result.totalPages, result.currentPage, result.total);
        updateCharts();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar datos desde el servidor');
    }
}

// --- Renderizado de tabla ---
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay datos para mostrar</td></tr>';
        return;
    }
    
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.lat ? item.lat.toFixed(6) : 'N/A'}</td>
            <td>${item.lng ? item.lng.toFixed(6) : 'N/A'}</td>
            <td>${item.alt ? item.alt.toFixed(6) : 'N/A'}</td>
            <td>${item.temperature ? item.temperature.toFixed(2) : 'N/A'}</td>
            <td>${item.pressure ? item.pressure.toFixed(2) : 'N/A'}</td>
            <td>
                <button class="btn-action btn-edit" data-id="${item._id}">Editar</button>
                <button class="btn-action btn-delete" data-id="${item._id}">Eliminar</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Agregar event listeners a los botones de acción
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            editRecord(id);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            deleteRecord(id);
        });
    });
}

// --- Paginación ---
function updatePaginationInfo(totalPages, currentPage, total) {
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages} (${total} registros)`;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadDataFromServer();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    currentPage++;
    loadDataFromServer();
});

// --- Filtros y búsqueda ---
document.getElementById('searchBtn').addEventListener('click', applyFilters);
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        applyFilters();
    }
});

document.getElementById('dateFilter').addEventListener('change', applyFilters);
document.getElementById('sortBy').addEventListener('change', applyFilters);

function applyFilters() {
    currentPage = 1;
    loadDataFromServer();
}

// --- Editar registro ---
async function editRecord(id) {
    try {
        const response = await fetch(`/api/datacarro/${id}`);
        if (!response.ok) {
            throw new Error('Error al cargar registro');
        }
        
        const record = await response.json();
        
        // Llenar el formulario con los datos del registro
        document.getElementById('editId').value = record._id;
        document.getElementById('editLat').value = record.lat || '';
        document.getElementById('editLng').value = record.lng || '';
        document.getElementById('editAlt').value = record.alt || '';
        document.getElementById('editTemperature').value = record.temperature || '';
        document.getElementById('editPressure').value = record.pressure || '';
        
        // Mostrar el modal
        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Error al cargar registro para editar:', error);
        alert('Error al cargar el registro');
    }
}

// --- Eliminar registro ---
async function deleteRecord(id) {
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
        try {
            const response = await fetch(`/api/datacarro/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar registro');
            }
            
            await loadDataFromServer();
            alert('Registro eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar registro:', error);
            alert('Error al eliminar el registro');
        }
    }
}

// --- Modal de edición ---
const modal = document.getElementById('editModal');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.btn-cancel');

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);
    const alt = parseFloat(document.getElementById('editAlt').value);
    const temperature = parseFloat(document.getElementById('editTemperature').value);
    const pressure = parseFloat(document.getElementById('editPressure').value);
    
    try {
        const response = await fetch(`/api/datacarro/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat,
                lng,
                alt,
                temperature,
                pressure
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar registro');
        }
        
        await loadDataFromServer();
        alert('Registro actualizado correctamente');
        
        // Cerrar el modal
        modal.style.display = 'none';
    } catch (error) {
        console.error('Error al actualizar registro:', error);
        alert('Error al actualizar el registro');
    }
});

// --- Exportación de datos ---
document.getElementById('exportCsv').addEventListener('click', exportToCsv);
document.getElementById('exportJson').addEventListener('click', exportToJson);

function exportToCsv() {
    if (filteredData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const headers = ['ID', 'Fecha/Hora', 'Latitud', 'Longitud', 'Altitud', 'Temperatura (°C)', 'Presión (hPa)', 'Dirección'];
    const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
            item._id,
            new Date(item.timestamp).toISOString(),
            item.lat || '',
            item.lng || '',
            item.alt || '',
            item.temperature || '',
            item.pressure || '',
            item.direction || ''
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'datos_carro.csv', 'text/csv');
}

function exportToJson() {
    if (filteredData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const jsonContent = JSON.stringify(filteredData, null, 2);
    downloadFile(jsonContent, 'datos_carro.json', 'application/json');
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Gráficos ---
let temperatureChart = null;
let pressureChart = null;

function updateCharts() {
    updateTemperatureChart();
    updatePressureChart();
}

function updateTemperatureChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    
    const labels = filteredData
        .slice(0, 20)
        .reverse()
        .map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString();
        });
    
    const temperatures = filteredData
        .slice(0, 20)
        .reverse()
        .map(item => item.temperature || 0);
    
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura (°C)',
                data: temperatures,
                borderColor: '#e53e3e',
                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function updatePressureChart() {
    const ctx = document.getElementById('pressureChart').getContext('2d');
    
    const labels = filteredData
        .slice(0, 20)
        .reverse()
        .map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString();
        });
    
    const pressures = filteredData
        .slice(0, 20)
        .reverse()
        .map(item => item.pressure || 0);
    
    if (pressureChart) {
        pressureChart.destroy();
    }
    
    pressureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Presión (hPa)',
                data: pressures,
                borderColor: '#3182ce',
                backgroundColor: 'rgba(49, 130, 206, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// --- Subida de archivos JSON ---
const uploadArea = document.getElementById('uploadArea');
const jsonFileInput = document.getElementById('jsonFile');
const selectFileBtn = document.getElementById('selectFile');
const uploadPreview = document.getElementById('uploadPreview');
const plotDataBtn = document.getElementById('plotData');

selectFileBtn.addEventListener('click', () => {
    jsonFileInput.click();
});

jsonFileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
}

let uploadedData = [];

function handleFile(file) {
    if (file.type !== 'application/json') {
        alert('Por favor, seleccione un archivo JSON válido');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            uploadedData = JSON.parse(e.target.result);
            
            if (!Array.isArray(uploadedData)) {
                alert('El archivo JSON debe contener un array de objetos');
                return;
            }
            
            showUploadPreview(uploadedData);
        } catch (error) {
            alert('Error al leer el archivo JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function showUploadPreview(data) {
    const previewTable = document.getElementById('previewTable');
    
    const previewData = data.slice(0, 5);
    
    let previewHtml = '<table style="width: 100%; border-collapse: collapse;">';
    previewHtml += '<thead><tr><th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Campo</th><th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Valor</th></tr></thead>';
    previewHtml += '<tbody>';
    
    if (previewData.length > 0) {
        Object.keys(previewData[0]).forEach(key => {
            previewHtml += `<tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${key}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${previewData[0][key]}</td>
            </tr>`;
        });
    }
    
    previewHtml += '</tbody></table>';
    previewHtml += `<p style="margin-top: 10px;">Mostrando 1 de ${data.length} registros</p>`;
    
    previewTable.innerHTML = previewHtml;
    uploadPreview.style.display = 'block';
}

plotDataBtn.addEventListener('click', () => {
    if (uploadedData.length === 0) {
        alert('No hay datos para graficar');
        return;
    }
    
    document.querySelector('[data-tab="charts-tab"]').click();
    
    const tempData = uploadedData.map(item => ({
        timestamp: item.timestamp || new Date().toISOString(),
        temperature: item.temperature || 0,
        pressure: item.pressure || 0
    }));
    
    const originalData = [...allData];
    allData = tempData;
    filteredData = tempData;
    updateCharts();
    
    setTimeout(() => {
        allData = originalData;
        filteredData = [...originalData];
        updateCharts();
    }, 10000);
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromServer();
});
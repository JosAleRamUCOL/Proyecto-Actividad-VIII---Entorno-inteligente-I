import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import mqtt from "mqtt"; // <-- AÑADIR: Cliente MQTT
import http from "http"; // <-- AÑADIR: Servidor HTTP para Socket.IO
import { Server } from "socket.io"; // <-- AÑADIR: Servidor Socket.IO

const app = express();
const MONGO_URI = "mongodb://127.0.0.1:27017/loginDB";
const PORT = 3000;

// --- AÑADIR: Configuración de Socket.IO ---
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Ajusta esto en producción
  }
});

// Guardar 'io' para poder usarlo en otros lugares (aunque lo usaremos aquí)
app.set('io', io); 

// --- ESQUEMAS (Sin cambios) ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const dataCarroSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  alt: { type: Number, required: true },
  temperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  direction: { type: String, required: false },
  lineTracking: { type: Boolean, required: false }
});

const User = mongoose.model("User", userSchema);
const DataCarro = mongoose.model("DataCarro", dataCarroSchema);

// --- MIDDLEWARES (Sin cambios) ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// --- RUTAS DE ARCHIVOS HTML (Sin cambios) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'auth', 'index.html'));
});
// ... (todas tus otras rutas GET para /login, /register, /success, etc.)
app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'auth', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'auth', 'register.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'main', 'success.html'));
});

app.get('/gestion', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'gestion', 'gestion.html'));
});

app.get('/monitoreo', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'monitoreo', 'monitoreo.html'));
});

app.get('/basedatos', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'analisis', 'analisis.html'));
});

// --- RUTAS API (Auth - Sin cambios) ---
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
    res.json({ message: "Inicio de sesión exitoso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// --- RUTAS API (DataCarro - Sin cambios) ---
app.get("/api/datacarro", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtro de búsqueda
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { direction: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const data = await DataCarro.find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await DataCarro.countDocuments(filter);

    res.json({
      data,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los datos" });
  }
});

app.get("/api/datacarro/:id", async (req, res) => {
  try {
    const data = await DataCarro.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el registro" });
  }
});

app.post("/api/datacarro", async (req, res) => {
  try {
    const { lat, lng, alt, temperature, pressure, direction, lineTracking } = req.body;

    const newData = new DataCarro({
      lat,
      lng,
      alt,
      temperature,
      pressure,
      direction,
      lineTracking,
      timestamp: new Date()
    });

    await newData.save();
    res.status(201).json(newData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el registro" });
  }
});

app.put("/api/datacarro/:id", async (req, res) => {
  try {
    const { lat, lng, alt, temperature, pressure, direction, lineTracking } = req.body;

    const updatedData = await DataCarro.findByIdAndUpdate(
      req.params.id,
      { lat, lng, alt, temperature, pressure, direction, lineTracking },
      { new: true }
    );

    if (!updatedData) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    res.json(updatedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar el registro" });
  }
});

app.delete("/api/datacarro/:id", async (req, res) => {
  try {
    const deletedData = await DataCarro.findByIdAndDelete(req.params.id);

    if (!deletedData) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el registro" });
  }
});

// --- ELIMINADO ---
// Ya no necesitamos el endpoint POST /api/mqtt/data
// porque el servidor guardará los datos directamente.

// --- CONEXIÓN A MONGODB ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB");

    // --- INICIAR SERVIDOR HTTP (Reemplaza a app.listen) ---
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor en http://127.0.0.1:${PORT}`);
    });

    // --- AÑADIR: Iniciar el Middleware MQTT-MongoDB ---
    startMqttMiddleware();
  })
  .catch(err => {
        console.error("❌❌❌ ERROR FATAL DE CONEXIÓN A MONGODB ❌❌❌");
        console.error(err);
        process.exit(1);
      });


// --- AÑADIR: Lógica del Middleware MQTT ---
function startMqttMiddleware() {
  const client = mqtt.connect('ws://54.36.178.49:8080', {
    family: 4
  });

  client.on('connect', () => {
    client.subscribe('carro/data', (err) => {
        if (!err) {
            console.log('Suscrito al tópico: carro/data');
        } else {
            console.error('Error en suscripción:', err);
        }
    });
  });

  client.on('reconnect', () => {
    console.log('Reconectando al broker MQTT...');
  });

  client.on('offline', () => {
    console.log('Cliente MQTT offline');
  });

  client.on('message', async (topic, message) => {
    console.log(`Mensaje recibido en ${topic}: ${message.toString()}`);

    try {
      const data = JSON.parse(message.toString());

      // Aquí asumimos que el mensaje tiene la estructura correcta
      const newData = new DataCarro({
        lat: data.lat || 0, // Provee valores por defecto
        lng: data.lng || 0,
        alt: data.alt || 0,
        temperature: data.temperature || 0,
        pressure: data.pressure || 0,
        direction: data.direction || null,
        lineTracking: data.lineTracking || false,
        timestamp: new Date()
      });

      // Guardar en la base de datos
      await newData.save();
      console.log('Datos guardados en MongoDB');

      // --- AÑADIR: Emitir evento a TODOS los clientes web conectados ---
      io.emit('newData', newData); 

    } catch (error) {
      console.error('❌ Error al procesar mensaje MQTT:', error);
    }
  });

  client.on('error', (err) => {
    console.error('❌ Error en Middleware MQTT:', err);
  });
}

// --- AÑADIR: Manejo de conexiones de Socket.IO ---
io.on('connection', (socket) => {
  console.log(`🔌 Nuevo cliente web conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🛑 Cliente web desconectado: ${socket.id}`);
  });
});
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";

const app = express();
const MONGO_URI = "mongodb://127.0.0.1:27017/loginDB";
const PORT = 3000;

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  }
});

const dataCarroSchema = new mongoose.Schema({
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  lat: { 
    type: Number, 
    required: true 
  },
  lng: { 
    type: Number, 
    required: true 
  },
  temperature: { 
    type: Number, 
    required: true 
  },
  pressure: { 
    type: Number, 
    required: true 
  },
  direction: {
    type: String,
    required: false
  },
  lineTracking: {
    type: Boolean,
    required: false
  }
});

const User = mongoose.model("User", userSchema);

const DataCarro = mongoose.model("DataCarro", dataCarroSchema);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'auth', 'index.html'));
});

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

// Obtener un dato específico por ID
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

// Crear nuevo registro
app.post("/api/datacarro", async (req, res) => {
  try {
    const { lat, lng, temperature, pressure, direction, lineTracking } = req.body;

    const newData = new DataCarro({
      lat,
      lng,
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

// Actualizar registro existente
app.put("/api/datacarro/:id", async (req, res) => {
  try {
    const { lat, lng, temperature, pressure, direction, lineTracking } = req.body;

    const updatedData = await DataCarro.findByIdAndUpdate(
      req.params.id,
      { lat, lng, temperature, pressure, direction, lineTracking },
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

// Eliminar registro
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

// Endpoint para recibir datos MQTT y guardarlos en la base de datos
app.post("/api/mqtt/data", async (req, res) => {
  try {
    const { lat, lng, temperature, pressure, direction, lineTracking } = req.body;

    const newData = new DataCarro({
      lat: lat || null,
      lng: lng || null,
      temperature: temperature || null,
      pressure: pressure || null,
      direction: direction || null,
      lineTracking: lineTracking || false,
      timestamp: new Date()
    });

    await newData.save();
    
    // Emitir evento WebSocket para actualizar clientes en tiempo real
    if (req.app.get('io')) {
      req.app.get('io').emit('newData', newData);
    }

    res.status(201).json({ message: "Datos guardados correctamente", data: newData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al guardar los datos MQTT" });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.error("Error de conexión:", err));

app.listen(PORT, () => console.log(`Servidor en http://127.0.0.1:${PORT}`));
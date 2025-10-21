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

const User = mongoose.model("User", userSchema);

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


// Resto del código se mantiene igual...
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

mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.error("Error de conexión:", err));

app.listen(PORT, () => console.log(`Servidor en http://127.0.0.1:${PORT}`));
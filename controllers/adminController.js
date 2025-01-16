const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectToDatabase } = require("../config/db");

const getAdmins = async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const [rows] = await pool.query("SELECT id, email FROM  eventos.admins");

    return res.json(rows);
  } catch (error) {
    console.error("Error al obtener admins:", error);
    return res.status(500).json({ message: "Error al obtener admins" });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ message: "Faltan campos obligatorios (email y password)." });
    }

    const pool = await connectToDatabase();

    const [existing] = await pool.query("SELECT id FROM  eventos.admins WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Ya existe un Admin con ese email." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO eventos.admins (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );

    const newAdmin = {
      id: result.insertId,
      email
    };

    return res.status(201).json({
      message: "Admin creado con éxito",
      admin: newAdmin,
    });
  } catch (error) {
    console.error("Error al crear admin:", error);
    return res.status(500).json({ message: "Error al crear admin" });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectToDatabase();

    // Verificar si existe
    const [existing] = await pool.query("SELECT id FROM  eventos.admins WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "No existe un Admin con ese ID." });
    }

    // Eliminar
    await pool.query("DELETE FROM  eventos.admins WHERE id = ?", [id]);

    return res.json({ message: "Admin eliminado con éxito" });
  } catch (error) {
    console.error("Error al eliminar admin:", error);
    return res.status(500).json({ message: "Error al eliminar admin" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar
    if (!email || !password) {
      return res.status(400).json({ message: "Faltan email y/o password." });
    }

    const pool = await connectToDatabase();

    const [rows] = await pool.query("SELECT * FROM  eventos.admins WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Email o contraseña incorrectos" });
    }

    const admin = rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email o contraseña incorrectos" });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, "esounejem", {
      expiresIn: "7d",
    });

    return res.json({ 
      message: "Login exitoso",
      token
    });
  } catch (error) {
    console.error("Error al hacer login:", error);
    return res.status(500).json({ message: "Error al hacer login" });
  }
};

module.exports = {
  getAdmins,
  createAdmin,
  deleteAdmin,
  loginAdmin,
};

const { connectToDatabase } = require('../config/db');

const validateUser = async (req, res) => {
    const { identification } = req.body;

    if (!identification) {
        return res.status(400).json({ message: 'La identificación es obligatoria.' });
    }

    try {
        const pool = await connectToDatabase();
        const [rows] = await pool.query('SELECT * FROM eventos.users WHERE identification = ?', [identification]);

        if (rows.length === 0) {
            return res.json({ registered: false });
        }

        return res.json({ registered: true });
    } catch (error) {
        console.error('Error al validar el usuario:', error);
        res.status(500).json({ message: 'Error al validar el usuario', error: error.message });
    }
};

const createUser = async (req, res) => {
    console.log(req.body)
    const { fullName, identification, birthDate, osigd, gender, ethnicity, disability, leader, migrant } = req.body;

    if (!fullName || !identification || !birthDate) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (fullName, identification, birthDate).' });
    }

    try {
        const pool = await connectToDatabase();

        const [existingUser] = await pool.query('SELECT * FROM eventos.users WHERE identification = ?', [identification]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'La identificación ya está registrada' });
        }

        const [result] = await pool.query(
            `INSERT INTO eventos.users (fullName, identification, birthDate, osigd, gender, ethnicity, disability, leader, migrant) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fullName, identification, birthDate, osigd, gender, ethnicity, disability, leader, migrant]
        );

        const newUser = {
            id: result.insertId,
            fullName,
            identification,
            birthDate,
            osigd,
            gender,
            ethnicity,
            disability,
            leader,
            migrant,
        };

        res.status(201).json({
            message: 'Usuario creado con éxito',
            user: newUser,
        });
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'La identificación ya está registrada.' });
        }
        res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
    }
};

module.exports = { validateUser, createUser };

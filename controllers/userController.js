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

        return res.json({ registered: true, user: rows[0] });
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


const getTotalUsers = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const [rows] = await pool.query('SELECT COUNT(*) AS totalUsers FROM eventos.users');

        if (rows.length > 0) {
            const totalUsers = rows[0].totalUsers;
            return res.status(200).json({ totalUsers });
        }

        res.status(404).json({ message: 'No se encontraron usuarios en la base de datos.' });
    } catch (error) {
        console.error('Error al obtener el total de usuarios:', error);
        res.status(500).json({ message: 'Error al obtener el total de usuarios.', error: error.message });
    }
};

const getGenderDistribution = async (req, res) => {
    try {
        const pool = await connectToDatabase();

        const [rows] = await pool.query(`
            SELECT gender, COUNT(*) as count
            FROM eventos.users
            GROUP BY gender
        `);

        const distribution = rows.reduce((acc, row) => {
            acc[row.gender] = row.count;
            return acc;
        }, {});

        res.status(200).json(distribution);
    } catch (error) {
        console.error("Error al obtener la distribución de género:", error);
        res.status(500).json({ message: "Error al obtener la distribución de género", error: error.message });
    }
};

const getUsersByOSIGD = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const [rows] = await pool.query(`
            SELECT osigd, COUNT(*) as count
            FROM eventos.users
            GROUP BY osigd
        `);

        const distribution = rows.reduce((acc, row) => {
            acc[row.osigd] = row.count;
            return acc;
        }, {});

        res.status(200).json(distribution);
    } catch (error) {
        console.error("Error al obtener distribución por OSIGD:", error);
        res.status(500).json({ message: "Error al obtener distribución por OSIGD", error: error.message });
    }
};

const getUsersByMigrante = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const [rows] = await pool.query(`
            SELECT migrant, COUNT(*) as count
            FROM eventos.users
            GROUP BY migrant
        `);

        const distribution = rows.reduce((acc, row) => {
            acc[row.migrant] = row.count;
            return acc;
        }, {});

        res.status(200).json(distribution);
    } catch (error) {
        console.error("Error al obtener distribución por migrantes:", error);
        res.status(500).json({ message: "Error al obtener distribución por migrantes", error: error.message });
    }
};

const getUsersByLeader = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const [rows] = await pool.query(`
            SELECT leader, COUNT(*) as count
            FROM eventos.users
            GROUP BY leader
        `);

        const distribution = rows.reduce((acc, row) => {
            acc[row.leader] = row.count;
            return acc;
        }, {});

        res.status(200).json(distribution);
    } catch (error) {
        console.error("Error al obtener distribución por líderes sociales:", error);
        res.status(500).json({ message: "Error al obtener distribución por líderes sociales", error: error.message });
    }
};


module.exports = { validateUser, createUser, getTotalUsers, getGenderDistribution, getUsersByOSIGD, getUsersByMigrante, getUsersByLeader };

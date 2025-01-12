const { connectToDatabase } = require('../config/db');

const getEvents = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const [events] = await pool.query('SELECT * FROM eventos.events');
        res.json(events);
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
    }
};

const validateEvent = async (req, res) => {
    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({ message: 'El ID del evento es obligatorio.' });
    }

    try {
        const pool = await connectToDatabase();
        const [events] = await pool.query('SELECT * FROM eventos.events WHERE id = ?', [eventId]);

        if (events.length === 0) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        return res.json({ event: events[0] });
    } catch (error) {
        console.error('Error al validar el evento:', error);
        res.status(500).json({ message: 'Error al validar el evento', error: error.message });
    }
};

const createEvent = async (req, res) => {
    const { name, location, date, type, description } = req.body;

    if (!name || !location || !date) {
        return res.status(400).json({ message: 'Los campos name, location y date son obligatorios.' });
    }

    try {
        const pool = await connectToDatabase();

        const [result] = await pool.query(
            `INSERT INTO eventos.events (name, location, date, type, description) VALUES (?, ?, ?, ?, ?)`,
            [name, location, date, type, description]
        );

        const newEvent = {
            id: result.insertId,
            name,
            location,
            date,
            type,
            description,
        };

        res.status(201).json({
            message: 'Evento creado con éxito',
            event: newEvent,
        });
    } catch (error) {
        console.error('Error al crear el evento:', error);
        res.status(500).json({ message: 'Error al crear el evento', error: error.message });
    }
};

module.exports = { getEvents, validateEvent, createEvent };

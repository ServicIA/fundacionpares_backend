const { connectToDatabase } = require('../config/db');
const QRCode = require('qrcode');

const getEventsWithAttendees = async (req, res) => {
    try {
      const { name, type, startDate, endDate, location } = req.query;
  
      let query = `
        SELECT 
          e.id AS eventId,
          e.name, 
          e.location, 
          e.date, 
          e.type, 
          e.description,
  
          -- Campos completos del usuario:
          u.id AS userId, 
          u.fullName,
          u.identification,
          u.birthDate,
          u.osigd,
          u.gender,
          u.ethnicity,
          u.disability,
          u.leader,
          u.migrant,
          u.createdAt AS userCreatedAt,
          u.updatedAt AS userUpdatedAt
  
        FROM eventos.events e
        LEFT JOIN eventos.assistance a ON e.id = a.eventId
        LEFT JOIN eventos.users u ON a.userId = u.id
        WHERE 1=1
      `;
  
      const params = [];
  
      if (name) {
        query += " AND e.name LIKE ? ";
        params.push(`%${name}%`);
      }
  
      if (type) {
        query += " AND e.type = ? ";
        params.push(type);
      }
  
      if (startDate) {
        query += " AND e.date >= ? ";
        params.push(startDate);
      }
      if (endDate) {
        query += " AND e.date <= ? ";
        params.push(endDate);
      }
  
      if (location) {
        query += " AND e.location LIKE ? ";
        params.push(`%${location}%`);
      }
  
      query += " ORDER BY e.id ";
  
      const pool = await connectToDatabase();
      const [rows] = await pool.query(query, params);
  
      const eventsMap = new Map();
  
      for (const row of rows) {
        if (!eventsMap.has(row.eventId)) {
          eventsMap.set(row.eventId, {
            id: row.eventId,
            name: row.name,
            location: row.location,
            date: row.date,
            type: row.type,
            description: row.description,
            attendees: [],
          });
        }
        if (row.userId) {
          eventsMap.get(row.eventId).attendees.push({
            id: row.userId,
            fullName: row.fullName,
            identification: row.identification,
            birthDate: row.birthDate,
            osigd: row.osigd,
            gender: row.gender,
            ethnicity: row.ethnicity,
            disability: !!row.disability,  
            leader: !!row.leader,         
            migrant: !!row.migrant,
            createdAt: row.userCreatedAt,
            updatedAt: row.userUpdatedAt,
          });
        }
      }
  
      const eventsArray = Array.from(eventsMap.values());
      res.status(200).json(eventsArray);
    } catch (error) {
      console.error('Error al obtener eventos con asistentes:', error);
      res.status(500).json({
        message: 'Error retrieving events with attendees',
        error: error.message
      });
    }
  };

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

const generateEventQRCode = async (req, res) => {
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

        const qrData = `${eventId}`;
        const qrCodeBase64 = await QRCode.toDataURL(qrData);

        res.json({
            message: 'Código QR generado con éxito',
            qrCode: qrCodeBase64,
        });
    } catch (error) {
        console.error('Error al generar el código QR:', error);
        res.status(500).json({ message: 'Error al generar el código QR', error: error.message });
    }
};

const deleteEvent = async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await connectToDatabase();
  
      const [rows] = await pool.query('SELECT * FROM eventos.events WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Evento no encontrado.' });
      }
  
      await pool.query('DELETE FROM eventos.events WHERE id = ?', [id]);
  
      return res.status(200).json({ message: `Evento con ID ${id} eliminado correctamente.` });
    } catch (error) {
      console.error('Error al eliminar el evento:', error);
      return res.status(500).json({
        message: 'Error al eliminar el evento',
        error: error.message,
      });
    }
  };

  const getFilteredEvents = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const pool = await connectToDatabase();

        // Construcción dinámica de la consulta con filtros
        let query = `SELECT * FROM eventos.events`;
        const queryParams = [];

        if (startDate) {
            query += ` WHERE date >= ?`;
            queryParams.push(startDate);
        }

        if (endDate) {
            query += startDate ? ` AND date <= ?` : ` WHERE date <= ?`;
            queryParams.push(endDate);
        }

        const [rows] = await pool.query(query, queryParams);

        res.status(200).json(rows);
      } catch (error) {
          console.error('Error al obtener eventos filtrados:', error);
          res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
      }
  };

  const getEventsByMonth = async (req, res) => {
    try {
        const pool = await connectToDatabase();

        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(date, '%Y-%m') AS month,
                COUNT(*) AS eventsCount
            FROM eventos.events
            GROUP BY month
            ORDER BY month ASC
        `);

        const eventsByMonth = rows.map(row => ({
            month: row.month,
            eventsCount: row.eventsCount,
        }));

        res.status(200).json(eventsByMonth);
    } catch (error) {
        console.error('Error al obtener eventos por mes:', error);
        res.status(500).json({ message: 'Error al obtener eventos por mes.', error: error.message });
    }
};

module.exports = { getEvents, validateEvent, createEvent, generateEventQRCode, getEventsWithAttendees, deleteEvent, getFilteredEvents, getEventsByMonth };

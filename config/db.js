const mysql = require('mysql2/promise');
const { getSecret } = require('./secrets');
const dotenv = require('dotenv');

dotenv.config();

const SECRET_NAME = process.env.DB_CREDENTIALS_SECRET_NAME;

let pool;

const connectToDatabase = async () => {
    if (!pool) {
        try {
            const secret = await getSecret(SECRET_NAME);

            pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: secret.username,
                password: process.env.DB_PASSWORD,
                database: process.env.DBNAME,
                port: process.env.DB_PORT,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
            });

            console.log('Conexión a la base de datos configurada correctamente.');
        } catch (error) {
            console.error('Error al conectar a la base de datos:', error);
            throw error;
        }
    }

    return pool;
};

module.exports = { connectToDatabase };

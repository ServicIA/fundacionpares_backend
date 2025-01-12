const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { connectToDatabase } = require('../config/db');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadFileToS3 = async (fileBuffer, fileName, folder) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${folder}/${Date.now()}-${fileName}`,
        Body: fileBuffer,
        ContentType: 'image/png',
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

const uploadHandler = async (req, res) => {
    const { userId, eventId, signature } = req.body;

    try {
        let fileUrl = '';

        if (signature) {
            const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fileUrl = await uploadFileToS3(buffer, `signature-${Date.now()}.png`, 'signatures');
        }

        if (req.file) {
            fileUrl = await uploadFileToS3(req.file.buffer, req.file.originalname, 'photos');
        }

        const pool = await connectToDatabase();

        const [existing] = await pool.query(
            `SELECT * FROM eventos.assistance WHERE userId = ? AND eventId = ?`,
            [userId, eventId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'El usuario ya está registrado en este evento.' });
        }

        const [result] = await pool.query(
            `INSERT INTO eventos.assistance (userId, eventId, ${signature ? 'signaturePath' : 'photoPath'}) VALUES (?, ?, ?)`,
            [userId, eventId, fileUrl]
        );

        res.status(201).json({
            message: 'Archivo subido y asistencia registrada con éxito',
            assistanceId: result.insertId,
            fileUrl,
        });
    } catch (error) {
        console.error('Error al manejar la subida:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El usuario ya está registrado en este evento.' });
        }

        res.status(500).json({ message: 'Error al registrar la asistencia', error: error.message });
    }
};


module.exports = { uploadHandler };

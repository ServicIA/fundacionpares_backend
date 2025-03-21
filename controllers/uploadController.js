const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { connectToDatabase } = require('../config/db');
const dotenv = require('dotenv');

const { validateUser, createUser } = require('../controllers/userController');

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadParentalAuthorization = async (req, res) => {
  const {
      userId,
      eventId,
      fullName,
      identification,
      documentType,
      birthDate,
      phone,
      email,
      osigd,
      gender,
      ethnicity,
      disability,
      leader,
      migrant,
      organization,
      municipality,
      department
  } = req.body;

  if (!req.file) {
      return res.status(400).json({ message: 'Debe proporcionar un archivo de autorización.' });
  }

  try {
      const pool = await connectToDatabase();

      const parsedEventId = parseInt(eventId, 10);

      if (isNaN(parsedEventId)) {
          return res.status(400).json({ message: 'El "eventId" debe ser un número válido.' });
      }

      let validatedUserId = userId;

      if (!validatedUserId) {
          const userValidationResponse = await callValidateUserMocked(identification);

          if (!userValidationResponse.registered) {
              const userCreationResponse = await callCreateUserMocked({
                  fullName,
                  identification,
                  documentType,
                  birthDate,
                  phone,
                  email,
                  osigd,
                  gender,
                  ethnicity,
                  disability: disability === 'true',
                  leader,
                  migrant: migrant === 'true',
                  organization,
                  municipality,
                  department,
              });

              if (userCreationResponse.error) {
                  return res.status(400).json({ message: 'Error al crear el usuario.', error: userCreationResponse.error });
              }

              validatedUserId = userCreationResponse.user.id;
          } else {
              validatedUserId = userValidationResponse.user.id;
          }
      }

      const [user] = await pool.query(`SELECT * FROM eventos.users WHERE id = ?`, [validatedUserId]);

      if (user.length === 0) {
          return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const fileUrl = await uploadFileToS3(req.file.buffer, req.file.originalname, 'parental-authorizations');

      const [result] = await pool.query(
          `INSERT INTO eventos.parental_authorizations (userId, eventId, authorizationPath) VALUES (?, ?, ?)`,
          [validatedUserId, parsedEventId, fileUrl]
      );

      return res.status(201).json({
          message: 'Autorización subida con éxito.',
          authorizationId: result.insertId,
          fileUrl,
      });
  } catch (error) {
      console.error('Error al subir la autorización:', error);
      return res.status(500).json({ message: 'Error al subir la autorización.', error: error.message });
  }
};


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
  const {
      userId,
      eventId,
      signature,
      fullName,
      identification,
      documentType,
      birthDate,
      phone,
      email,
      osigd,
      gender,
      ethnicity,
      disability,
      leader,
      migrant,
      organization,
      municipality,
      department
  } = req.body;

  try {
      const pool = await connectToDatabase();

      const parsedEventId = parseInt(eventId, 10);

      if (isNaN(parsedEventId)) {
          return res.status(400).json({ message: 'eventId debe ser un número válido.' });
      }

      let validatedUserId = userId;

      if (!validatedUserId) {
          const userValidationResponse = await callValidateUserMocked(identification);

          if (!userValidationResponse.registered) {
              const userCreationResponse = await callCreateUserMocked({
                  fullName,
                  identification,
                  documentType,
                  birthDate,
                  phone,
                  email,
                  osigd,
                  gender,
                  ethnicity,
                  disability: disability === 'true',
                  leader,
                  migrant: migrant === 'true',
                  organization,
                  municipality,
                  department,
              });

              if (userCreationResponse.error) {
                  return res.status(400).json({ message: 'Error al crear el usuario.', error: userCreationResponse.error });
              }

              validatedUserId = userCreationResponse.user.id;
          } else {
              validatedUserId = userValidationResponse.user.id;
          }
      }

      console.log('Validated userId:', validatedUserId, 'Parsed eventId:', parsedEventId);

      const [existing] = await pool.query(
          `SELECT * FROM eventos.assistance WHERE userId = ? AND eventId = ?`,
          [validatedUserId, parsedEventId]
      );

      if (existing.length > 0) {
          return res.status(400).json({ message: 'El usuario ya está registrado en este evento.' });
      }

      let fileUrl = '';

      if (signature) {
          const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          fileUrl = await uploadFileToS3(buffer, `signature-${Date.now()}.png`, 'signatures');
      }

      const [result] = await pool.query(
          `INSERT INTO eventos.assistance (userId, eventId, signaturePath) VALUES (?, ?, ?)`,
          [validatedUserId, parsedEventId, fileUrl]
      );

      return res.status(201).json({
          message: 'Archivo subido y asistencia registrada con éxito',
          assistanceId: result.insertId,
          fileUrl,
      });
  } catch (error) {
      console.error('Error al manejar la subida:', error);

      return res.status(500).json({ message: 'Error al registrar la asistencia', error: error.message });
  }
};

const processBatchUpload = async (req, res) => {
  const { users, eventId } = req.body;

  if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar un array de usuarios en "users".' });
  }
  if (!eventId) {
      return res.status(400).json({ message: 'El "eventId" es obligatorio para registrar asistencia.' });
  }

  try {
      const pool = await connectToDatabase();
      const results = [];

      for (const user of users) {
          const userValidationResponse = await callValidateUserMocked(user.identification);

          let userId;
          if (!userValidationResponse.registered) {
              const userCreationResponse = await callCreateUserMocked({
                  fullName: user.fullName,
                  identification: user.identification,
                  documentType: user.documentType,
                  birthDate: user.birthDate,
                  phone: user.phone,
                  email: user.email,
                  osigd: user.osigd,
                  gender: user.gender,
                  ethnicity: user.ethnicity,
                  disability: user.disability === 'true',
                  leader: user.leader,
                  migrant: user.migrant === 'true',
                  organization: user.organization,
                  municipality: user.municipality,
                  department: user.department,
              });

              if (userCreationResponse.error) {
                  results.push({ identification: user.identification, error: userCreationResponse.error });
                  continue;
              }
              userId = userCreationResponse.user.id;
          } else {
              userId = userValidationResponse.user.id;
          }

          const [existing] = await pool.query(
              `SELECT * FROM eventos.assistance WHERE userId = ? AND eventId = ?`,
              [userId, eventId]
          );

          if (existing.length > 0) {
              results.push({
                  identification: user.identification,
                  message: 'El usuario ya está registrado en este evento.',
              });
              continue;
          }

          let fileUrl = '';

          if (user.signature) {
              try {
                  const base64Data = user.signature.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  fileUrl = await uploadFileToS3(buffer, `signature-${Date.now()}.png`, 'signatures');

                  const [assistanceResult] = await pool.query(
                      `INSERT INTO eventos.assistance (userId, eventId, signaturePath) VALUES (?, ?, ?)`,
                      [userId, eventId, fileUrl]
                  );

                  results.push({
                      identification: user.identification,
                      assistanceId: assistanceResult.insertId,
                      signaturePath: fileUrl,
                  });
                  continue;
              } catch (err) {
                  console.error('Error subiendo firma a S3:', err);
                  results.push({ identification: user.identification, error: 'Error al subir la firma.' });
                  continue;
              }
          }

          if (!user.signature) {
              const [assistanceResult] = await pool.query(
                  `INSERT INTO eventos.assistance (userId, eventId) VALUES (?, ?)`,
                  [userId, eventId]
              );
              results.push({
                  identification: user.identification,
                  assistanceId: assistanceResult.insertId,
                  message: 'Asistencia registrada sin archivo.',
              });
          }
      }

      return res.status(200).json({
          message: 'Batch procesado exitosamente',
          results,
      });
  } catch (error) {
      console.error('Error al procesar el batch:', error);
      return res.status(500).json({
          message: 'Error al procesar el batch',
          error: error.message,
      });
  }
};

  
async function callValidateUserMocked(identification) {
  return new Promise((resolve, reject) => {
      const mockReq = { body: { identification } };
  
      const mockRes = {
      status: (code) => ({
          json: (data) => {
          if (code >= 400) {
              reject({ code, ...data });
          } else {
              resolve(data);
          }
          },
      }),
      json: (data) => resolve(data),
      };
  
      validateUser(mockReq, mockRes);
  });
}
  
  
async function callCreateUserMocked(userData) {
  return new Promise((resolve, reject) => {
      const mockReq = { body: userData };

      const mockRes = {
      status: (code) => ({
          json: (data) => {
          if (code >= 400) {
              resolve({ error: data.message });
          } else {
              resolve(data);
          }
          },
      }),
      json: (data) => resolve(data),
      };

      createUser(mockReq, mockRes);
  });
}

module.exports = {
    uploadHandler,
    processBatchUpload,
    uploadParentalAuthorization
};

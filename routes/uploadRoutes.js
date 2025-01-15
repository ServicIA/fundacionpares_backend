const express = require('express');
const multer = require('multer');
const { uploadHandler, processBatchUpload } = require('../controllers/uploadController');
const { check, validationResult } = require('express-validator');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const validateUpload = [
    check('userId', 'El ID del usuario es obligatorio')
        .notEmpty()
        .isInt()
        .withMessage('El ID del usuario debe ser un número entero'),
    check('eventId', 'El ID del evento es obligatorio')
        .notEmpty()
        .isInt()
        .withMessage('El ID del evento debe ser un número entero'),
    check('signature', 'La firma debe ser una cadena en base64')
        .optional()
        .custom((value) => {
            if (value && !value.startsWith('data:image')) {
                throw new Error('La firma debe ser una imagen en formato base64');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateFile = (req, res, next) => {
    if (!req.file && !req.body.signature) {
        return res.status(400).json({ message: 'Se requiere un archivo o una firma en base64 para registrar la asistencia.' });
    }

    if (req.file) {
        const allowedMimeTypes = ['image/png', 'image/jpeg'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: 'El archivo debe ser una imagen en formato PNG o JPEG.' });
        }
    }

    next();
};

router.post(
    '/',
    upload.single('file'),
    validateUpload,
    validateFile,
    uploadHandler
);

router.post(
    '/batch/upload',
    [
      check('eventId', 'El ID del evento es obligatorio')
        .notEmpty()
        .isInt()
        .withMessage('El ID del evento debe ser un número entero'),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      },
    ],
    processBatchUpload
  );

module.exports = router;

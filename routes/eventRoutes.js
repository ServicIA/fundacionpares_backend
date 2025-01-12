const express = require('express');
const { getEvents, validateEvent, createEvent } = require('../controllers/eventController');
const { check, validationResult } = require('express-validator');

const router = express.Router();

router.get('/', getEvents);

router.post(
    '/validate',
    [
        check('eventId', 'El ID del evento es obligatorio').notEmpty(),
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    validateEvent
);

router.post(
    '/',
    [
        check('name', 'El nombre del evento es obligatorio').notEmpty(),
        check('location', 'La ubicación del evento es obligatoria').notEmpty(),
        check('date', 'La fecha del evento es obligatoria')
            .notEmpty()
            .isISO8601()
            .withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)'),
        check('type', 'El tipo de evento es obligatorio')
            .notEmpty()
            .isString()
            .withMessage('El tipo de evento debe ser un texto válido'),
        check('description')
            .optional()
            .isString()
            .withMessage('La descripción debe ser un texto'),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        },
    ],
    createEvent
);

module.exports = router;

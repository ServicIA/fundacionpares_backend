const express = require('express');
const { validateUser, createUser } = require('../controllers/userController');
const router = express.Router();
const { check, validationResult } = require('express-validator');

router.post('/validate', 
    [
        check('identification', 'La identificación del usuario es obligatoria.').notEmpty(),
        check('identification', 'La identificación del usuario debe ser numérica.').isNumeric()
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({"errors": errors.array() });
        }
        next();
    }
    ,
    validateUser
);

router.post('/',
    [
        check('identification', 'La identificación es obligatoria.').notEmpty(),
        check('identification', 'La identificación debe ser numérica.').isNumeric(),
        check('fullName', 'El nombre completo es obligatorio.').notEmpty(),
        check('osigd', 'La clasificación OSIGD es obligatoria.').notEmpty(),
        check('gender', 'El género es obligatorio.').notEmpty(),
        check('birthDate', 'La fecha de nacimiento es obligatoria.').notEmpty(),
        check('birthDate', 'La fecha de nacimiento debe ser válida.').isISO8601(),
        check('ethnicity', 'La etnicidad es obligatoria.').notEmpty(),
        check('disability', 'La selección de condición de discapacidad debe ser un valor booleano.').isBoolean(),
        check('leader', 'La selección de lider social debe ser un valor booleano.').isBoolean(),
        check('migrant', 'La selección de migrante debe ser un valor booleano.').isBoolean(),
        check('disability', 'La selección de condición de discapacidad es obligatoria.').notEmpty(),
        check('leader', 'La selección de lider social es obligatoria.').notEmpty(),
        check('migrant', 'La selección de migrante es obligatoria.').notEmpty(),
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({"errors": errors.array() });
        }
        next();
    },
    createUser
)

module.exports = router;

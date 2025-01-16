const express = require("express");
const router = express.Router();

const { getAdmins, createAdmin, deleteAdmin, loginAdmin } = require("../controllers/adminController");

router.get("/", getAdmins);       
router.post("/", createAdmin);   
router.delete("/:id", deleteAdmin);   
router.post("/login", loginAdmin);  

module.exports = router;

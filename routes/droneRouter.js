// routes/router.js
const express = require("express");
const { createDrone, getAllDrones, deleteDrone, getDroneById, updateStatusDrone, consumeDroneBattery } = require("../controllers/droneController");

const router = express.Router();

router.post("/", createDrone);
router.get("/", getAllDrones);
router.get("/:id", getDroneById)
router.delete("/:id", deleteDrone)
router.patch("/status/:id", updateStatusDrone)
router.patch("/bateria/:id", consumeDroneBattery)

module.exports = router;

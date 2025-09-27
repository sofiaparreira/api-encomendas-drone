// routes/router.js
const express = require("express");
const { createDrone, getAllDrones, deleteDrone, getDroneById, updateStatusDrone, startFlight } = require("../controllers/droneController");

const router = express.Router();

router.post("/", createDrone);
router.get("/", getAllDrones);
router.get("/:id", getDroneById)
router.delete("/:id", deleteDrone)
router.patch("/status/:id", updateStatusDrone)
router.post("/start-voo/:id", startFlight)


module.exports = router;

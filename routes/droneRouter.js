// routes/router.js
const express = require("express");
const { createDrone, getAllDrones, deleteDrone, getDroneById, updateStatusDrone } = require("../controllers/droneController");

const router = express.Router();

router.post("/", createDrone);
router.get("/", getAllDrones);
router.get("/:id", getDroneById)
router.delete("/:id", deleteDrone)
router.patch("/:id", updateStatusDrone)

module.exports = router;

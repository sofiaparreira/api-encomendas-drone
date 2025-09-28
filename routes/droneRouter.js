const express = require("express");
const {
  createDrone,
  getAllDrones,
  deleteDrone,
  getDroneById,
  updateStatusDrone,
  startFlight,
  rechargeBattery
} = require("../controllers/droneController");
const { droneValidation } = require("../middlewares/droneMiddleware");
const validate = require("../middlewares/handleValidate");

const router = express.Router();

router.post("/", droneValidation(), validate, createDrone);
router.get("/", getAllDrones);
router.get("/:id", getDroneById);
router.delete("/:id", deleteDrone);
router.patch("/status/:id", updateStatusDrone);
router.post("/start-flight/:id", startFlight); 
router.patch("/recharge/:id", rechargeBattery); 


module.exports = router;

// routes/router.js
const express = require("express");
const { getFilaByDroneId } = require("../controllers/filaController");

const router = express.Router();

router.get("/:id", getFilaByDroneId);

module.exports = router;

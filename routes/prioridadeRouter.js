// routes/router.js
const express = require("express");
const { createPrioridade, getPrioridades, deletePrioridade } = require("../controllers/prioridadeController");

const router = express.Router();

router.post("/", createPrioridade);
router.get("/", getPrioridades)
router.delete("", deletePrioridade)



module.exports = router;

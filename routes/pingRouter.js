const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await mongoose.connection.db.admin().ping();
    await mongoose.connection.close();
    res.status(200).json({ message: "Ping realizado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao pingar o MongoDB" });
  }
});

module.exports = router;

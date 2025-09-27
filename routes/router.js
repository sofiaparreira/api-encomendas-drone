const express = require("express");
const router = express.Router();

const droneRouter = require("./droneRouter");
const pedidoRouter = require("./pedidoRouter")
const prioridadeRouter = require("./prioridadeRouter")


router.use('/drone', droneRouter);
router.use('/pedido', pedidoRouter)
router.use('/prioridade', prioridadeRouter)

router.get("/", (req, res) => {
  res.json({ message: "API funcionando" });
});

module.exports = router;

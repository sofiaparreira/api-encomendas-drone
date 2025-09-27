// routes/router.js
const express = require("express");
const { createPedido, getPedidosPendentes, getPedidosTransporte, getPedidosEntregues } = require("../controllers/pedidoController");

const router = express.Router();

router.post("/", createPedido);
router.get("/pendente", getPedidosPendentes)
router.get("/transporte", getPedidosTransporte)
router.get("/entregue", getPedidosEntregues)


module.exports = router;

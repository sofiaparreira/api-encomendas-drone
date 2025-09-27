// routes/router.js
const express = require("express");
const { 
        createPedido, 
        getPedidosPendentes, 
        getPedidosTransporte, 
        getPedidosEntregues, 
        getPedidoByDroneId 
    } = require("../controllers/pedidoController");

const router = express.Router();

router.post("/", createPedido);
router.get("/pendente", getPedidosPendentes)
router.get("/transporte", getPedidosTransporte)
router.get("/entregue", getPedidosEntregues)
router.get("/drone/:id", getPedidoByDroneId)


module.exports = router;

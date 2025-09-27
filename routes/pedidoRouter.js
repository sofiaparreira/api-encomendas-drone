// routes/router.js
const express = require("express");
const { 
        createPedido, 
        getPedidosPendentes, 
        getPedidosTransporte, 
        getPedidosEntregues, 
        getPedidoByDroneId,
        updateStatusPedido,
        deletePedido
    } = require("../controllers/pedidoController");

const router = express.Router();

router.post("/", createPedido);
router.delete("/:id", deletePedido)

router.get("/pendente", getPedidosPendentes)
router.get("/transporte", getPedidosTransporte)
router.get("/entregue", getPedidosEntregues)
router.get("/drone/:id", getPedidoByDroneId)
router.patch("/status/:id", updateStatusPedido)



module.exports = router;

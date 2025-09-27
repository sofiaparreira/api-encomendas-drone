const { Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { selecionarMelhorDroneParaPedido } = require("../utils/selecionarMelhorDroneParaPedido");

async function createPedido(req, res) {
  try {
    const body = req.body;

    if (!body.enderecoDestino || typeof body.enderecoDestino.coordX === "undefined" || typeof body.enderecoDestino.coordY === "undefined") {
      return res.status(400).json({ error: "enderecoDestino.coordX e coordY são obrigatórios" });
    }

    const { coordX, coordY } = body.enderecoDestino;
    const pesoKg = body.pesoKg;

    const melhorDrone = await selecionarMelhorDroneParaPedido({ coordX, coordY, pesoKg });
    if (!melhorDrone) {
      return res.status(400).json({ error: "Nenhum drone disponível que atenda ao peso/dados do pedido" });
    }

    const pedido = await Pedido.create({
      ...body,
      droneId: melhorDrone._id
    });

    await Drone.findByIdAndUpdate(melhorDrone._id, { status: "reservado" });

    return res.status(201).json({
      message: "Pedido criado com sucesso e drone atribuído",
      pedido,
      drone: {
        id: melhorDrone._id,
        nome: melhorDrone.nome,
        capacidadeMaxKg: melhorDrone.capacidadeMaxKg,
        coordX: melhorDrone.coordX,
        coordY: melhorDrone.coordY,
        distanciaAoDestino: melhorDrone._distanciaAoDestino ?? null
      }
    });
  } catch (err) {
    console.error("Erro createPedido:", err);
    return res.status(500).json({ error: "Erro ao solicitar pedido, entre em contato com o suporte" });
  }
}

async function getPedidosPendentes(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "pendente" });
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar pedidos, contate o suporte" });
  }
}

async function getPedidosTransporte(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "em_transporte" });
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar pedidos, contate o suporte" });
  }
}

async function getPedidosEntregues(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "entregue" });
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar pedidos, contate o suporte" });
  }
}


async function getPedidoByDroneId(req, res) {
  const { id } = req.params;

  try {
    const pedido = await PedidoModel.findOne({ droneId: id });
    if (!pedido) {
      return res.status(404).json({ error: "Nenhum pedido encontrado para esse drone" })
    }

    return res.status(200).json(pedido);

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Erro ao buscar pedido" })
  }
}



module.exports = {
  createPedido,
  getPedidosPendentes,
  getPedidosTransporte,
  getPedidosEntregues,
  getPedidoByDroneId
};
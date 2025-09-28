const { Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { selecionarMelhorDroneParaPedido, parseNumberSafe } = require("../utils/selecionarMelhorDroneParaPedido");
const { Fila: FilaModel, Fila } = require("../models/Fila");
const { Entrega: EntregaModel, Entrega } = require("../models/Entrega");


async function createPedido(req, res) {
  try {
    const body = req.body;

    if (
      !body.enderecoDestino ||
      typeof body.enderecoDestino.coordX === "undefined" ||
      typeof body.enderecoDestino.coordY === "undefined"
    ) {
      return res
        .status(400)
        .json({ error: "enderecoDestino.coordX e coordY são obrigatórios" });
    }

    const { coordX, coordY } = body.enderecoDestino;
    const pesoKg = parseNumberSafe(body.pesoKg);
    if (Number.isNaN(pesoKg) || pesoKg <= 0) {
      return res.status(400).json({ error: "pesoKg inválido" });
    }

    const prioridade = body.prioridadeId;

    // Seleciona o melhor drone que ainda possa carregar este pedido
    const melhorDrone = await selecionarMelhorDroneParaPedido({
      coordX,
      coordY,
      pesoKg,
      prioridade,
    });

    if (!melhorDrone) {
      return res.status(400).json({
        error: "Nenhum drone disponível com capacidade suficiente para este pedido",
      });
    }

    // Checa se existe uma entrega agendada que consiga comportar o peso
    let entrega = await Entrega.findOne({
      drone: melhorDrone._id,
      status: "agendada",
      capacidadeRestante: { $gte: pesoKg }, // aqui garante que não ultrapasse capacidade
    });

    if (!entrega) {
      // Nenhuma entrega existente comporta o pedido, cria nova se ainda couber
      if (pesoKg > melhorDrone.capacidadeMaxKg) {
        return res.status(400).json({
          error: `Pedido excede a capacidade máxima do drone (${melhorDrone.capacidadeMaxKg} kg)`,
        });
      }
      entrega = await Entrega.create({
        drone: melhorDrone._id,
        pedidos: [],
        totalPeso: 0,
        capacidadeRestante: melhorDrone.capacidadeMaxKg,
        droneMaxPayloadSnapshot: melhorDrone.capacidadeMaxKg,
        status: "agendada",
        scheduledAt: new Date(),
      });
    }

    // Adiciona pedido à entrega
    if (pesoKg > entrega.capacidadeRestante) {
      return res.status(400).json({
        error: "Não há capacidade suficiente nesta entrega para adicionar o pedido",
      });
    }

    const pedido = await Pedido.create({
      ...body,
      droneId: melhorDrone._id,
    });

    entrega.pedidos.push(pedido._id);
    entrega.totalPeso += pesoKg;
    entrega.capacidadeRestante -= pesoKg;
    await entrega.save();

    // Atualiza fila
    let fila = await FilaModel.findOne({ droneId: melhorDrone._id });
    if (fila) {
      if (!fila.entregas.includes(entrega._id)) {
        fila.entregas.push(entrega._id);
        await fila.save();
      }
    } else {
      await FilaModel.create({
        droneId: melhorDrone._id,
        entregas: [entrega._id],
        status: "aguardando",
      });
    }

    // Se drone estava disponível, muda para reservado
    if (melhorDrone.status === "disponivel") {
      await Drone.findByIdAndUpdate(melhorDrone._id, { status: "reservado" });
    }

    return res.status(201).json({
      message: "Pedido criado com sucesso e atribuído a uma entrega",
      pedido,
      entrega,
      drone: {
        id: melhorDrone._id,
        nome: melhorDrone.nome,
        capacidadeMaxKg: melhorDrone.capacidadeMaxKg,
      },
    });

  } catch (err) {
    console.error("Erro createPedido:", err);
    return res
      .status(500)
      .json({ error: "Erro ao solicitar pedido, entre em contato com o suporte" });
  }
}


async function getPedidosPendentes(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "pendente" })
      .populate("prioridadeId")
      .populate("droneId");
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar pedidos, contate o suporte" });
  }
}

async function getPedidosTransporte(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "em_transporte" })
      .populate("prioridadeId")
      .populate("droneId");
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar pedidos, contate o suporte" });
  }
}

async function getPedidosEntregues(req, res) {
  try {
    const pedidos = await PedidoModel.find({ status: "entregue" })
      .populate("prioridadeId")
      .populate("droneId");
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


async function updateStatusPedido(req, res) {
  try {
    const id = req.params.id
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do pedido é obrigatório" });
    }
    if (!status) {
      return res.status(404).json({ error: "Status é obrigatório " })
    }

    const pedido = await DroneModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    return res.status(200).json(pedido);

  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function deletePedido(req, res) {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "ID do pedido é obrigatório" })
    }

    const pedido = await PedidoModel.findById(id)
    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    await Pedido.findByIdAndDelete(id);

    return res.status(200).json({ message: "Pedido deletado com sucesso" });
  }

  catch (error) {
    console.error("Erro ao deletar pedido:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}


module.exports = {
  createPedido,
  getPedidosPendentes,
  getPedidosTransporte,
  getPedidosEntregues,
  getPedidoByDroneId,
  updateStatusPedido,
  deletePedido
};
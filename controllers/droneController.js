const { Drone: DroneModel, Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { Fila: FilaModel, Fila } = require("../models/Fila");

const { selecionarMelhorDroneParaPedido } = require("../utils/selecionarMelhorDroneParaPedido");


async function createDrone(req, res) {
  try {
    const data = req.body;
    const drone = await DroneModel.create(data);
    return res.status(200).json(drone);
  } catch (error) {
    console.error(`Erro ao cadastrar drone: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro ao cadastrar drone, entre em contato com o suporte" });
  }
}

async function getAllDrones(req, res) {
  try {
    const drones = await DroneModel.find();
    if (!drones) {
      return res.status(404).json({ message: "Você não tem nenhum drone cadastrado" })
    }

    return res.status(200).json(drones)
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar drones, contate o suporte" })
  }
}

async function getDroneById(req, res) {
  try {
    const id = req.params.id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const drone = await Drone.findById(id);

    if (!drone) {
      return res.status(404).json({ error: "Drone não encontrado." });
    }

    return res.status(200).json(drone);
  } catch (err) {
    console.error("Erro getDroneById:", err);
    return res.status(500).json({ error: "Erro ao buscar drone, contate o suporte." });
  }
}


async function deleteDrone(req, res) {
  try {
    const id = req.params.id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const drone = await DroneModel.findById(id);
    if (!drone) return res.status(404).json({ error: "Drone não encontrado" });

    if (!["disponivel", "reservado"].includes(drone.status)) {
      return res.status(400).json({ error: `Drone com status '${drone.status}' não pode ser excluído` });
    }

    const pedidos = await PedidoModel.find({ droneId: drone._id });

    for (const pedido of pedidos) {
      if (!pedido.prioridadeId) {
        pedido.prioridadeId = "68d70331d1a141e0520c6c63";
      }

      const melhorDrone = await selecionarMelhorDroneParaPedido({
        coordX: pedido.enderecoDestino.coordX,
        coordY: pedido.enderecoDestino.coordY,
        pesoKg: pedido.pesoKg,
        prioridade: pedido.prioridadeId
      });

      if (!melhorDrone) {
        console.warn(`Pedido ${pedido._id} não tem drone disponível e ficará sem atribuição.`);
        continue;
      }

      pedido.droneId = melhorDrone._id;
      await pedido.save();

      let fila = await FilaModel.findOne({ droneId: melhorDrone._id });
      if (fila) {
        fila.pedidos.push(pedido._id);
        await fila.save();
      } else {
        await FilaModel.create({ droneId: melhorDrone._id, pedidos: [pedido._id], status: "aguardando" });
      }

      if (melhorDrone.status === "disponivel") {
        await DroneModel.findByIdAndUpdate(melhorDrone._id, { status: "reservado" });
      }
    }

    await drone.deleteOne();

    return res.status(200).json({ message: "Drone excluído e pedidos realocados com sucesso" });
  } catch (e) {
    console.error("Erro ao excluir drone:", e.message);
    return res.status(500).json({ error: "Erro ao excluir drone, contate o suporte" });
  }
}


async function startFlight(req, res) {
  try {
    const droneId = req.params.id;

    if(!droneId) {
      return res.status(400).json({ error: "Id do drone não encontrado"})
    }

    const drone = await DroneModel.findById(droneId);
    if(!drone) {
      return res.status(404).json({ error: "Drone não encontrado"})
    }

    if(drone.status !== "reservado") {
      return res.status(400).json({error: `Drone com status ${drone.status} não pode iniciar voo` })
    }

    // buscar o drone na fila dele
    const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
    if(!fila || !fila.pedidos.length === 0) {
      return res.status(400).json({ error: "Não há pedidos na fila para iniciar voo"})
    }

    // pega o primeiro pedido da fila
    const pedido = fila.pedidos[0];
    drone.status = "entregando"
    await drone.save();

    pedido.status = "em_transporte";
    await pedido.save();

    return res.status(200).json({
      message: "Voo iniciado com sucesso",
      drone: { id: drone._id, status: drone.status},
      pedido: { id: pedido._id, status: pedido.status}
    })
  } catch (error) {
     console.error("Erro startFlight:", err);
    return res.status(500).json({ error: "Erro ao iniciar voo, contate o suporte" });
  }
}



async function updateStatusDrone(req, res) {
  try {
    const id = req.params.id
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do drone é obrigatório" });
    }
    if (!status) {
      return res.status(404).json({ error: "Status é obrigatório " })
    }

    const drone = await DroneModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!drone) {
      return res.status(404).json({ error: "Drone não encontrado" });
    }
    return res.status(200).json(drone);

  } catch (error) {
    console.error("Erro ao atualizar status do drone:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}


async function consumeDroneBattery(req, res) {
  try {
    const { id } = req.params;
    const drone = await DroneModel.findById(id);

    if (!drone) {
      return res.status(404).json({ error: "Drone não encontrado" })
    }
    if (drone.status !== "entregando" || drone.status !== "retornando") {
      return res.status(400).json({ error: "Drone não está em voo" })
    }

    const novaBateria = Math.max(drone.porcentagemBateria - 5, 0);
    drone.porcentagemBateria = novaBateria;
    await drone.save();

    return res.status(200).json({ bateria: novaBateria })


  } catch (error) {
    console.error("Erro ao atualizar bateria do drone:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}


module.exports = {
  createDrone,
  getAllDrones,
  deleteDrone,
  getDroneById,
  updateStatusDrone,
  consumeDroneBattery,
  startFlight
};

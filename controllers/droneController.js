const { Drone: DroneModel, Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { Fila: FilaModel, Fila } = require("../models/Fila");
const { broadcastDronePosition } = require("../utils/wsServer");

const { selecionarMelhorDroneParaPedido, calcularDistanciaKm, parseNumberSafe } = require("../utils/selecionarMelhorDroneParaPedido");
const mongoose = require("mongoose");

async function createDrone(req, res) {
  try {
    const data = req.body;

    if (data.coordX !== undefined) data.homeCoordX = data.coordX;
    if (data.coordY !== undefined) data.homeCoordY = data.coordY;

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

// atualizando status do drone
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

const activeSimulations = new Map();

// iniciando voo
async function startFlight(req, res) {
  try {
    const droneId = req.params.id;

    if (!droneId) {
      return res.status(400).json({ error: "Id do drone não encontrado" });
    }

    if (!mongoose.Types.ObjectId.isValid(droneId)) {
      return res.status(400).json({ error: "ID do drone inválido" });
    }

    const drone = await DroneModel.findById(droneId);
    if (!drone) {
      return res.status(404).json({ error: "Drone não encontrado" });
    }

    if (drone.status !== "reservado") {
      return res
        .status(400)
        .json({ error: `Drone com status ${drone.status} não pode iniciar voo` });
    }

    // buscar a fila e verificar pedidos
    const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
    if (!fila || fila.pedidos.length === 0) {
      return res
        .status(400)
        .json({ error: "Não há pedidos na fila para iniciar voo" });
    }

    const pedido = fila.pedidos[0];

    drone.homeCoordX = drone.coordX;
    drone.homeCoordY = drone.coordY;
    drone.currentPedidoId = pedido._id;
    drone.status = "entregando";
    await drone.save();

    pedido.status = "em_transporte";
    await pedido.save();

    // inicia a simulação
    if (!activeSimulations.has(String(droneId))) {
      simulateFlight(String(droneId));
    } else {
      console.log(`Simulação já ativa para drone ${droneId}, não criando uma nova.`);
    }

    return res.status(200).json({
      message: "Voo iniciado com sucesso",
      drone: { id: drone._id, status: drone.status },
      pedido: { id: pedido._id, status: pedido.status },
    });
  } catch (error) {
    console.error("Erro startFlight:", error);
    return res
      .status(500)
      .json({ error: "Erro ao iniciar voo, contate o suporte" });
  }
}

// --- rota de simulacao de voo --- 
async function simulateFlight(droneId) {
  if (activeSimulations.has(String(droneId))) return;

  const interval = setInterval(async () => {
    try {
      const drone = await DroneModel.findById(droneId);
      if (!drone) {
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      const status = drone.status;

      const homeX = Number(drone.homeCoordX ?? 0);
      const homeY = Number(drone.homeCoordY ?? 0);
      let droneX = Number(drone.coordX ?? 0);
      let droneY = Number(drone.coordY ?? 0);
      let battery = Number(drone.porcentagemBateria ?? 100);

      let targetX = 0;
      let targetY = 0;
      let pedido = null;

      if (status === "entregando") {
        if (drone.currentPedidoId) {
          pedido = await PedidoModel.findById(drone.currentPedidoId);
        }
        if (!pedido) {
          const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          if (!fila || fila.pedidos.length === 0) {
            await DroneModel.findByIdAndUpdate(droneId, { status: "retornando" });
            return;
          }
          pedido = fila.pedidos[0];
        }
        targetX = Number(pedido.enderecoDestino.coordX ?? 0);
        targetY = Number(pedido.enderecoDestino.coordY ?? 0);
      } else if (status === "retornando") {
        // sempre volta para a posição inicial salva
        targetX = homeX;
        targetY = homeY;
      } else {
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      const speedPer5Sec = 0.5; // passo por 5s
      const speedDegrees = speedPer5Sec / 111;

      const deltaX = targetX - droneX;
      const deltaY = targetY - droneY;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (battery <= 0) {
        console.log(`Drone ${droneId} ficou sem bateria!`);
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      if (distance <= speedDegrees) {
        // chegou no destino
        droneX = targetX;
        droneY = targetY;

        if (status === "entregando") {
          battery = Math.max(0, battery - 1);

          await DroneModel.findByIdAndUpdate(droneId, {
            coordX: droneX,
            coordY: droneY,
            porcentagemBateria: battery,
            status: "retornando",
            currentPedidoId: null,
          });

          if (pedido) {
            pedido.status = "entregue";
            await pedido.save();
          }

          const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          if (fila && fila.pedidos.length) {
            fila.pedidos.shift();
            await fila.save();
          }
        } else if (status === "retornando") {
          const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          const hasPending = fila && fila.pedidos.length > 0;

          await DroneModel.findByIdAndUpdate(droneId, {
            coordX: droneX,
            coordY: droneY,
            porcentagemBateria: battery,
            status: hasPending ? "reservado" : "disponivel",
            currentPedidoId: null,
          });

          clearInterval(interval);
          activeSimulations.delete(String(droneId));
        }
      } else {
        const moveRatio = speedDegrees / distance;
        droneX += deltaX * moveRatio;
        droneY += deltaY * moveRatio;
        battery = Math.max(0, battery - 1);

        await DroneModel.findByIdAndUpdate(droneId, {
          coordX: droneX,
          coordY: droneY,
          porcentagemBateria: battery,
        });
      }

      // envia atualização via WebSocket
      const updatedDrone = await DroneModel.findById(droneId);
      broadcastDronePosition(updatedDrone);

      console.log(`Drone ${droneId} voando (${status}) — X:${droneX.toFixed(6)} Y:${droneY.toFixed(6)} Bat:${battery}%`);
    } catch (err) {
      console.error("Erro na simulação de voo:", err);
      clearInterval(interval);
      activeSimulations.delete(String(droneId));
    }
  }, 4000);

  activeSimulations.set(String(droneId), interval);
}


// --- rota de recarregar bateria do drone ---
const activeRecharges = new Map();

async function rechargeBattery(req, res) {

  try {
    const droneId = req.params.id;

    if (!droneId) {
      return res.status(400).json({ error: "ID do drone não fornecido" });
    }

    if (!mongoose.Types.ObjectId.isValid(droneId)) {
      return res.status(400).json({ error: "ID do drone inválido" });
    }

    const drone = await DroneModel.findById(droneId);
    if (!drone) {
      return res.status(404).json({ error: "Drone não encontrado" });
    }

    // só permite carregar quando status for disponivel ou reservado
    if (!["disponivel", "reservado"].includes(drone.status)) {
      return res.status(400).json({
        error: `Drone com status "${drone.status}" não pode recarregar agora`
      });
    }

    if (activeRecharges.has(droneId)) {
      return res.status(400).json({ error: "Recarga já está em andamento para este drone" });
    }

    await DroneModel.findByIdAndUpdate(droneId, { status: "recarregando" });

    let battery = drone.porcentagemBateria ?? 0;

    const interval = setInterval(async () => {
      try {
        battery = Math.min(100, battery + 5);

        await DroneModel.findByIdAndUpdate(droneId, { porcentagemBateria: battery });

        console.log(`Drone ${droneId} recarregando... ${battery}%`);

        if (battery >= 100) {
          clearInterval(interval);
          activeRecharges.delete(droneId);

          const fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          const statusFinal = fila && fila.pedidos.length > 0 ? "reservado" : "disponivel";

          await DroneModel.findByIdAndUpdate(droneId, { status: statusFinal });
          console.log(`Drone ${droneId} totalmente recarregado, status: ${statusFinal}`);
        }
      } catch (err) {
        console.error(`Erro recarregando drone ${droneId}:`, err);
        clearInterval(interval);
        activeRecharges.delete(droneId);
      }
    }, 1000);

    activeRecharges.set(droneId, interval);

    return res.status(200).json({ message: "Recarga iniciada", droneId, battery });
  } catch (error) {
    console.error("Erro na recarga do drone:", error);
    return res.status(500).json({ error: "Erro ao recarregar o drone" });
  }
}




module.exports = {
  createDrone,
  getAllDrones,
  deleteDrone,
  getDroneById,
  updateStatusDrone,
  startFlight,
  simulateFlight,
  rechargeBattery
};

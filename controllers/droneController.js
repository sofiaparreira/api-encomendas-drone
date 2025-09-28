const { Drone: DroneModel, Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { Fila: FilaModel, Fila } = require("../models/Fila");

const { selecionarMelhorDroneParaPedido, calcularDistanciaKm, parseNumberSafe } = require("../utils/selecionarMelhorDroneParaPedido");
const mongoose = require("mongoose");

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

    // startFlight
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

function simulateFlight(droneId) {
  if (activeSimulations.has(String(droneId))) return;

  const interval = setInterval(async () => {
    try {
      // NÃO usar .lean() — queremos sempre o documento atualizado diretamente do mongoose
      const drone = await DroneModel.findById(droneId);
      if (!drone) {
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      const status = drone.status;
      let targetX = null;
      let targetY = null;
      let pedido = null;
      let fila = null;

      if (status === "entregando") {
        // tenta usar currentPedidoId (setado no startFlight)
        if (drone.currentPedidoId) {
          pedido = await PedidoModel.findById(drone.currentPedidoId);
        }
        // se não tiver pedido válido, tenta pegar da fila (fallback)
        if (!pedido) {
          fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          if (!fila || fila.pedidos.length === 0) {
            // não há pedido — manda retornar
            await DroneModel.findByIdAndUpdate(droneId, { status: "retornando" });
            return;
          }
          pedido = fila.pedidos[0];
        }

        targetX = parseFloat(pedido.enderecoDestino.coordX) || 0;
        targetY = parseFloat(pedido.enderecoDestino.coordY) || 0;
      } else if (status === "retornando") {
        // aqui usamos EXPLICITAMENTE o homeCoord salvo no banco
        // fallback: se não existir, usar as coordenadas atuais (evita perder o drone)
        const homeX = (typeof drone.homeCoordX === "number")
          ? drone.homeCoordX
          : (drone.homeCoordX ? parseFloat(drone.homeCoordX) : null);

        const homeY = (typeof drone.homeCoordY === "number")
          ? drone.homeCoordY
          : (drone.homeCoordY ? parseFloat(drone.homeCoordY) : null);

        if (homeX === null || homeY === null) {
          console.warn(`Drone ${droneId} não tem homeCoord salvo — usando coord atual como target.`);
          targetX = parseFloat(drone.coordX) || 0;
          targetY = parseFloat(drone.coordY) || 0;
        } else {
          targetX = homeX;
          targetY = homeY;
        }
      } else {
        // status inesperado: encerra simulação
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      let droneX = parseFloat(drone.coordX) || 0;
      let droneY = parseFloat(drone.coordY) || 0;
      let battery = typeof drone.porcentagemBateria === "number"
        ? drone.porcentagemBateria
        : (drone.porcentagemBateria ? parseFloat(drone.porcentagemBateria) : 100);

      const speedPer10Sec = 0.5;
      const speedDegrees = speedPer10Sec / 111;

      if (battery <= 0) {
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        console.log(`Drone ${droneId} ficou sem bateria!`);
        return;
      }

      const deltaX = targetX - droneX;
      const deltaY = targetY - droneY;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      // chegou no alvo
      if (distance === 0 || distance <= speedDegrees) {
        droneX = targetX;
        droneY = targetY;

        if (status === "entregando") {
          battery = Math.max(0, battery - 5);

          // atualiza: chegou no destino e começa retorno
          await DroneModel.findByIdAndUpdate(droneId, {
            coordX: droneX,
            coordY: droneY,
            porcentagemBateria: battery,
            status: "retornando",
            currentPedidoId: null
          });

          if (pedido) {
            pedido.status = "entregue";
            await pedido.save();
          }

          // remove o pedido da fila (se existir)
          fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          if (fila && fila.pedidos.length) {
            fila.pedidos.shift();
            await fila.save();
          }

          console.log(`Drone ${droneId} entregou pedido ${pedido?._id} — iniciando retorno à base.`);
          return; // espera próxima iteração para tratar o retorno
        } else if (status === "retornando") {
          // chegou na base — decide reservado ou disponivel
          fila = await FilaModel.findOne({ droneId }).populate("pedidos");
          const hasPending = fila && fila.pedidos && fila.pedidos.length > 0;

          await DroneModel.findByIdAndUpdate(droneId, {
            coordX: droneX,
            coordY: droneY,
            porcentagemBateria: battery,
            status: hasPending ? "reservado" : "disponivel",
            currentPedidoId: null
          });

          console.log(
            `Drone ${droneId} chegou à base. ` +
            (hasPending
              ? `Mudando status para 'reservado' (há ${fila.pedidos.length} pedidos pendentes).`
              : "Mudando status para 'disponivel' (nenhum pedido pendente).")
          );

          clearInterval(interval);
          activeSimulations.delete(String(droneId));
          return;
        }
      }

      // ainda não chegou -> mova um passo
      if (distance > 0) {
        const moveRatio = speedDegrees / distance;
        const moveX = deltaX * moveRatio;
        const moveY = deltaY * moveRatio;

        droneX += moveX;
        droneY += moveY;
        battery = Math.max(0, battery - 1);

        await DroneModel.findByIdAndUpdate(droneId, {
          coordX: droneX,
          coordY: droneY,
          porcentagemBateria: battery,
        });

        console.log(
          `Drone ${droneId} voando (${status}) — X:${droneX.toFixed(6)} Y:${droneY.toFixed(6)} Bat:${battery}%`
        );
      }
    } catch (err) {
      console.error("Erro na simulação de voo:", err);
      clearInterval(interval);
      activeSimulations.delete(String(droneId));
    }
  }, 10000);

  activeSimulations.set(String(droneId), interval);
}


module.exports = {
  createDrone,
  getAllDrones,
  deleteDrone,
  getDroneById,
  updateStatusDrone,
  startFlight,
  simulateFlight
};

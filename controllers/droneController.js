const { Drone: DroneModel, Drone } = require("../models/Drone");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");
const { Fila: FilaModel, Fila } = require("../models/Fila");
const { Entrega: EntregaModel, Entrega } = require("../models/Entrega");

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

    const entregas = await EntregaModel.find({ drone: drone._id });
    for (const entrega of entregas) {
      const pedidos = await PedidoModel.find({ _id: { $in: entrega.pedidos } });

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

        let novaEntrega = await EntregaModel.findOne({
          drone: melhorDrone._id,
          status: "agendada"
        });

        if (novaEntrega) {
          if (novaEntrega.capacidadeRestante >= pedido.pesoKg) {
            novaEntrega.pedidos.push(pedido._id);
            novaEntrega.totalPeso += pedido.pesoKg;
            novaEntrega.capacidadeRestante -= pedido.pesoKg;
            await novaEntrega.save();
          } else {
            novaEntrega = await EntregaModel.create({
              drone: melhorDrone._id,
              pedidos: [pedido._id],
              totalPeso: pedido.pesoKg,
              capacidadeRestante: melhorDrone.capacidadeMaxKg - pedido.pesoKg,
              droneMaxPayloadSnapshot: melhorDrone.capacidadeMaxKg,
              status: "agendada",
              scheduledAt: new Date(),
            });
          }
        } else {
          novaEntrega = await EntregaModel.create({
            drone: melhorDrone._id,
            pedidos: [pedido._id],
            totalPeso: pedido.pesoKg,
            capacidadeRestante: melhorDrone.capacidadeMaxKg - pedido.pesoKg,
            droneMaxPayloadSnapshot: melhorDrone.capacidadeMaxKg,
            status: "agendada",
            scheduledAt: new Date(),
          });
        }

        let fila = await FilaModel.findOne({ droneId: melhorDrone._id });
        if (fila) {
          if (!fila.entregas.includes(novaEntrega._id)) {
            fila.entregas.push(novaEntrega._id);
            await fila.save();
          }
        } else {
          await FilaModel.create({
            droneId: melhorDrone._id,
            entregas: [novaEntrega._id],
            status: "aguardando",
          });
        }

        if (melhorDrone.status === "disponivel") {
          await DroneModel.findByIdAndUpdate(melhorDrone._id, { status: "reservado" });
        }
      }

      await EntregaModel.findByIdAndDelete(entrega._id);
    }

    await FilaModel.findOneAndDelete({ droneId: drone._id });

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
    console.log(`[START_FLIGHT] Iniciando voo para drone ${droneId}`);

    if (!droneId) return res.status(400).json({ error: "Id do drone não encontrado" });
    if (!mongoose.Types.ObjectId.isValid(droneId)) return res.status(400).json({ error: "ID do drone inválido" });

    const drone = await DroneModel.findById(droneId);
    if (!drone) return res.status(404).json({ error: "Drone não encontrado" });

    console.log(`🚁 [START_FLIGHT] Drone encontrado: ${drone.nome} (Status: ${drone.status}, Bateria: ${drone.porcentagemBateria}%)`);

    if (drone.status !== "reservado") {
      console.log(`[START_FLIGHT] Drone com status ${drone.status} não pode iniciar voo`);
      return res.status(400).json({ error: `Drone com status ${drone.status} não pode iniciar voo` });
    }

    if ((drone.porcentagemBateria ?? 0) < 30) {
      console.log(`[START_FLIGHT] Bateria insuficiente: ${drone.porcentagemBateria}%`);
      return res.status(400).json({ error: "Drone não pode iniciar voo com bateria menor que 30%" });
    }

    console.log(`[START_FLIGHT] Buscando fila para drone ${droneId}`);
    const fila = await FilaModel.findOne({ droneId }).populate({
      path: "entregas",
      populate: {
        path: "pedidos",
        populate: { path: "prioridadeId", select: "nome valor" }
      }
    });
    
    if (!fila || fila.entregas.length === 0) {
      console.log(`[START_FLIGHT] Nenhuma entrega encontrada na fila`);
      return res.status(400).json({ error: "Não há entregas na fila para iniciar voo" });
    }

    const entrega = fila.entregas[0];
    console.log(`📦 [START_FLIGHT] Primeira entrega: ${entrega._id} com ${entrega.pedidos.length} pedidos`);
    
    if (!entrega.pedidos || entrega.pedidos.length === 0) {
      console.log(`[START_FLIGHT] Entrega sem pedidos`);
      return res.status(400).json({ error: "A entrega não possui pedidos" });
    }

    // Log dos pedidos da entrega
    console.log(`[START_FLIGHT] Pedidos da entrega:`);
    entrega.pedidos.forEach((pedido, index) => {
      console.log(`   ${index + 1}. Pedido ${pedido._id} - Destino: (${pedido.enderecoDestino.coordX}, ${pedido.enderecoDestino.coordY})`);
    });

    // Salva posição inicial do drone
    console.log(`[START_FLIGHT] Salvando posição inicial: (${drone.coordX}, ${drone.coordY})`);
    drone.homeCoordX = drone.coordX;
    drone.homeCoordY = drone.coordY;
    drone.status = "entregando";
    await drone.save();

    console.log(`[START_FLIGHT] Atualizando status da entrega para 'em_voo'`);
    entrega.status = "em_voo";
    entrega.startedAt = new Date();
    await entrega.save();

    console.log(`[START_FLIGHT] Marcando ${entrega.pedidos.length} pedidos como 'em_transporte'`);
    for (const pedido of entrega.pedidos) {
      pedido.status = "em_transporte";
      await pedido.save();
    }

    // Atualiza status da fila
    console.log(`[START_FLIGHT] Atualizando fila para 'voando'`);
    fila.status = "voando";
    await fila.save();

    if (!activeSimulations.has(String(droneId))) {
      console.log(`[START_FLIGHT] Iniciando simulação de voo`);
      simulateFlight(String(droneId));
    } else {
      console.log(`[START_FLIGHT] Simulação já está ativa para este drone`);
    }

    console.log(`[START_FLIGHT] Voo iniciado com sucesso!`);
    return res.status(200).json({
      message: "Voo iniciado com sucesso",
      drone: { id: drone._id, status: drone.status },
      entrega: { 
        id: entrega._id, 
        status: entrega.status,
        pedidosCount: entrega.pedidos.length 
      },
    });
  } catch (error) {
    console.error("[START_FLIGHT] Erro:", error);
    return res.status(500).json({ error: "Erro ao iniciar voo, contate o suporte" });
  }
}


// --- rota de simulacao de voo --- 

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

      let status = drone.status;
      const homeX = Number(drone.homeCoordX ?? 0);
      const homeY = Number(drone.homeCoordY ?? 0);
      let droneX = Number(drone.coordX ?? 0);
      let droneY = Number(drone.coordY ?? 0);
      let battery = Number(drone.porcentagemBateria ?? 100);

      let targetX = homeX;
      let targetY = homeY;
      let pedido = null;
      let currentEntrega = null;

      if (status === "entregando") {
        if (drone.currentPedidoId) {
          pedido = await PedidoModel.findById(drone.currentPedidoId);
        }

        if (!pedido) {
          const fila = await FilaModel.findOne({ droneId }).populate({
            path: "entregas",
            populate: { path: "pedidos" }
          });

          if (fila && fila.entregas.length > 0) {
            currentEntrega = fila.entregas[0];
            if (currentEntrega.pedidos && currentEntrega.pedidos.length > 0) {
              pedido = currentEntrega.pedidos[0];
            }
          }

          if (!pedido) {
            await DroneModel.findByIdAndUpdate(droneId, { status: "retornando", currentPedidoId: null });
            return;
          }
        }

        targetX = Number(pedido.enderecoDestino.coordX ?? 0);
        targetY = Number(pedido.enderecoDestino.coordY ?? 0);

      } else if (status === "retornando") {
        targetX = homeX;
        targetY = homeY;
      } else {
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      if (battery <= 20 && status !== "retornando") {
        console.log(`Drone ${droneId} iniciando retorno de emergência por bateria baixa (${battery}%)`);
        targetX = homeX;
        targetY = homeY;
        status = "retornando";
      }

      const stepSize = 1;
      const deltaX = targetX - droneX;
      const deltaY = targetY - droneY;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (battery <= 0) {
        console.log(`Drone ${droneId} ficou sem bateria!`);
        clearInterval(interval);
        activeSimulations.delete(String(droneId));
        return;
      }

      if (distance > 0) {
        const moveRatio = Math.min(stepSize / distance, 1); 
        droneX += deltaX * moveRatio;
        droneY += deltaY * moveRatio;

        if ((deltaX > 0 && droneX > targetX) || (deltaX < 0 && droneX < targetX)) droneX = targetX;
        if ((deltaY > 0 && droneY > targetY) || (deltaY < 0 && droneY < targetY)) droneY = targetY;
        battery = Math.max(0, battery - 1);

        await DroneModel.findByIdAndUpdate(droneId, {
          coordX: droneX,
          coordY: droneY,
          porcentagemBateria: battery,
          status,
        });
      }

      if (droneX === targetX && droneY === targetY) {
        if (status === "entregando" && pedido) {
          pedido.status = "entregue";
          await pedido.save();

          if (currentEntrega && currentEntrega.pedidos.length > 0) {
            currentEntrega.pedidos.shift();
            await currentEntrega.save();
          }

          const fila = await FilaModel.findOne({ droneId }).populate({
            path: "entregas",
            populate: { path: "pedidos" }
          });

          if (fila && fila.entregas.length > 0) {
            const firstEntrega = fila.entregas[0];
            if (firstEntrega.pedidos.length > 0) {
              drone.currentPedidoId = firstEntrega.pedidos[0]._id;
              await DroneModel.findByIdAndUpdate(droneId, { currentPedidoId: drone.currentPedidoId });
            } else {
              fila.entregas.shift();
              await fila.save();
              if (fila.entregas.length === 0) {
                await DroneModel.findByIdAndUpdate(droneId, { status: "retornando", currentPedidoId: null });
              }
            }
          } else {
            await DroneModel.findByIdAndUpdate(droneId, { status: "retornando", currentPedidoId: null });
          }
        } else if (status === "retornando") {
          await DroneModel.findByIdAndUpdate(droneId, { status: "disponivel", currentPedidoId: null });
          clearInterval(interval);
          activeSimulations.delete(String(droneId));
        }
      }

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
    console.log(`[RECHARGE] Iniciando recarga para drone ${droneId}`);
    
    if (!droneId) return res.status(400).json({ error: "ID do drone não fornecido" });
    if (!mongoose.Types.ObjectId.isValid(droneId)) return res.status(400).json({ error: "ID do drone inválido" });

    const idStr = String(droneId);

    const drone = await DroneModel.findById(droneId);
    if (!drone) {
      console.log(`[RECHARGE] Drone ${droneId} não encontrado`);
      return res.status(404).json({ error: "Drone não encontrado" });
    }

    console.log(`[RECHARGE] Drone encontrado: ${drone.nome} (Status: ${drone.status}, Bateria: ${drone.porcentagemBateria}%)`);

    if (!["disponivel", "reservado"].includes(drone.status)) {
      console.log(`[RECHARGE] Drone com status "${drone.status}" não pode recarregar`);
      return res.status(400).json({ error: `Drone com status "${drone.status}" não pode recarregar agora` });
    }

    if (activeRecharges.has(idStr)) {
      console.log(`⚠️ [RECHARGE] Recarga já está em andamento para drone ${droneId}`);
      return res.status(400).json({ error: "Recarga já está em andamento para este drone" });
    }

    console.log(`[RECHARGE] Atualizando status do drone para 'recarregando'`);
    await DroneModel.findByIdAndUpdate(droneId, { status: "recarregando" });

    let battery = Number(drone.porcentagemBateria ?? 0);
    console.log(`[RECHARGE] Bateria inicial: ${battery}%`);

    const interval = setInterval(async () => {
      try {
        battery = Math.min(100, battery + 5);
        console.log(`[RECHARGE] Bateria: ${battery}%`);

        const updatedDrone = await DroneModel.findByIdAndUpdate(
          droneId,
          { porcentagemBateria: battery },
          { new: true }
        );

        broadcastDronePosition(updatedDrone); 
        console.log(`📡 [RECHARGE] WebSocket atualizado para drone ${droneId}`);

        if (battery >= 100) {
          console.log(`[RECHARGE] Bateria carregada! Verificando status final...`);
          clearInterval(interval);
          activeRecharges.delete(idStr);

          const fila = await FilaModel.findOne({ droneId }).populate({
            path: "entregas",
            populate: { path: "pedidos" }
          });
          
          if (fila && fila.entregas.length > 0) {
            const currentEntrega = fila.entregas[0];
            const currentPedido = currentEntrega.pedidos[0]; 
          }
          

          const statusFinal = hasPending ? "reservado" : "disponivel";
          console.log(`[RECHARGE] Status final: ${statusFinal}`);

          await DroneModel.findByIdAndUpdate(droneId, {
            porcentagemBateria: 100,
            status: statusFinal
          });

          console.log(`[RECHARGE] Drone ${droneId} totalmente recarregado! Status: ${statusFinal}`);

          const finalDrone = await DroneModel.findById(droneId);
          broadcastDronePosition(finalDrone);
          console.log(`📡 [RECHARGE] WebSocket final enviado`);
        }
      } catch (err) {
        console.error(`[RECHARGE] Erro recarregando drone ${droneId}:`, err);
        clearInterval(interval);
        activeRecharges.delete(idStr);
      }
    }, 1000);

    activeRecharges.set(idStr, interval);
    console.log(`[RECHARGE] Intervalo de recarga configurado para drone ${droneId}`);

    console.log(`[RECHARGE] Recarga iniciada com sucesso!`);
    return res.status(200).json({ message: "Recarga iniciada", droneId, battery });
  } catch (error) {
    console.error("[RECHARGE] Erro na recarga do drone:", error);
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

const { Drone: DroneModel, Drone } = require("../models/Drone");
const { Fila: FilaModel, Fila } = require("../models/Fila");
const { Entrega: EntregaModel, Entrega } = require("../models/Entrega");
const { Pedido: PedidoModel, Pedido } = require("../models/Pedido");



function parseNumberSafe(v) {
  if (v === undefined || v === null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(",", ".").trim();
    return Number(cleaned);
  }
  return NaN;
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}




async function selecionarMelhorDroneParaPedido({ coordX, coordY, pesoKg, prioridade }) {
  const destinoLat = parseNumberSafe(coordX);
  const destinoLon = parseNumberSafe(coordY);
  const peso = parseNumberSafe(pesoKg);

  if (Number.isNaN(destinoLat) || Number.isNaN(destinoLon)) throw new Error("coordX/coordY inválidos");
  if (Number.isNaN(peso)) throw new Error("pesoKg inválido");

  // Buscar drones disponíveis ou reservados
  let candidatos = await DroneModel.find({
    status: { $in: ["disponivel", "reservado"] },
    capacidadeMaxKg: { $gte: peso }
  }).lean();

  if (!candidatos.length) return null;

  // Pega filas associadas aos drones candidatos (sem popular pedidos)
  const filas = await FilaModel.find({
    droneId: { $in: candidatos.map(d => d._id) }
  }).lean();

  // Para cada fila, precisamos calcular:
  // - filaLength: soma de todos os pedidos presentes nas entregas da fila
  // - filaLastPedidoCreatedAt: createdAt do pedido mais recente entre todas as entregas da fila
  // Fazemos isso em paralelo para cada fila
  const filaMetricsByDroneId = {}; // chave: droneId.toString()

  await Promise.all(filas.map(async fila => {
    const droneIdStr = String(fila.droneId);
    const entregasIds = Array.isArray(fila.entregas) ? fila.entregas : [];

    if (entregasIds.length === 0) {
      filaMetricsByDroneId[droneIdStr] = { filaLength: 0, filaLastPedidoCreatedAt: null };
      return;
    }

    // Pega entregas para extrair os pedidos (cada entrega tem array de ObjectId em `pedidos`)
    const entregas = await EntregaModel.find({ _id: { $in: entregasIds } })
      .select("pedidos")
      .lean();

    // junta todos os pedidoIds
    const allPedidoIds = entregas.reduce((acc, e) => {
      if (Array.isArray(e.pedidos) && e.pedidos.length) acc.push(...e.pedidos);
      return acc;
    }, []);

    const filaLength = allPedidoIds.length;

    let filaLastPedidoCreatedAt = null;
    if (allPedidoIds.length > 0) {
      // pega o pedido mais recente (por createdAt) entre os pedidos coletados
      const lastPedido = await PedidoModel.find({ _id: { $in: allPedidoIds } })
        .sort({ createdAt: -1 })
        .limit(1)
        .select("createdAt")
        .lean();

      filaLastPedidoCreatedAt = lastPedido && lastPedido.length ? lastPedido[0].createdAt : null;
    }

    filaMetricsByDroneId[droneIdStr] = { filaLength, filaLastPedidoCreatedAt };
  }));

  // Anexa métricas aos candidatos
  candidatos = candidatos.map(d => {
    const key = String(d._id);
    const metrics = filaMetricsByDroneId[key] || { filaLength: 0, filaLastPedidoCreatedAt: null };
    return {
      ...d,
      filaLength: metrics.filaLength,
      filaLastPedidoCreatedAt: metrics.filaLastPedidoCreatedAt
    };
  });

  // Ordena por tamanho da fila (asc)
  candidatos.sort((a, b) => a.filaLength - b.filaLength);

  // pega os que têm menor fila
  const minFila = candidatos[0].filaLength;
  let empatesFila = candidatos.filter(d => d.filaLength === minFila);

  // desempata pelo tempo do último pedido (mais antigo primeiro)
  if (empatesFila.length > 1) {
    empatesFila.sort((a, b) => {
      const aTime = a.filaLastPedidoCreatedAt ? new Date(a.filaLastPedidoCreatedAt).getTime() : 0;
      const bTime = b.filaLastPedidoCreatedAt ? new Date(b.filaLastPedidoCreatedAt).getTime() : 0;
      return aTime - bTime;
    });
  }

  // se ainda houver empate, desempata pela distância ao destino
  if (empatesFila.length > 1) {
    empatesFila = empatesFila.map(d => {
      const lat = parseNumberSafe(d.coordX);
      const lon = parseNumberSafe(d.coordY);
      const distanciaKm = (Number.isNaN(lat) || Number.isNaN(lon))
        ? Infinity
        : calcularDistanciaKm(destinoLat, destinoLon, lat, lon);
      return { ...d, _distanciaKm: distanciaKm };
    });

    empatesFila.sort((a, b) => a._distanciaKm - b._distanciaKm);
  }

  // retorna o melhor candidato (ou null se não existir)
  return empatesFila.length ? empatesFila[0] : null;
}

module.exports = {
  selecionarMelhorDroneParaPedido,
  calcularDistanciaKm,
  parseNumberSafe
};

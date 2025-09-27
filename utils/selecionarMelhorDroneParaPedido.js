const { Drone } = require("../models/Drone");
const { Fila: FilaModel, Fila } = require("../models/Fila");

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
  let candidatos = await Drone.find({
    status: { $in: ["disponivel", "reservado"] },
    capacidadeMaxKg: { $gte: peso }
  }).lean();

  if (!candidatos.length) return null;

  const filas = await FilaModel.find({ droneId: { $in: candidatos.map(d => d._id) } }).populate("pedidos");

  candidatos = candidatos.map(d => {
    const fila = filas.find(f => f.droneId.toString() === d._id.toString());
    return {
      ...d,
      filaLength: fila ? fila.pedidos.length : 0,
      filaLastPedidoCreatedAt: fila && fila.pedidos.length ? fila.pedidos[fila.pedidos.length - 1].createdAt : null
    };
  });

  candidatos.sort((a, b) => a.filaLength - b.filaLength);

  let minFila = candidatos[0].filaLength;
  let empatesFila = candidatos.filter(d => d.filaLength === minFila);

  if (empatesFila.length > 1) {
    empatesFila.sort((a, b) => {
      const aTime = a.filaLastPedidoCreatedAt ? new Date(a.filaLastPedidoCreatedAt).getTime() : 0;
      const bTime = b.filaLastPedidoCreatedAt ? new Date(b.filaLastPedidoCreatedAt).getTime() : 0;
      return aTime - bTime; 
    });
  }

  if (empatesFila.length > 1) {
    empatesFila.forEach(d => {
      const lat = parseNumberSafe(d.coordX);
      const lon = parseNumberSafe(d.coordY);
      d._distanciaKm = Number.isNaN(lat) || Number.isNaN(lon)
        ? Infinity
        : calcularDistanciaKm(destinoLat, destinoLon, lat, lon);
    });
    empatesFila.sort((a, b) => a._distanciaKm - b._distanciaKm);
  }

  return empatesFila[0];
}
module.exports = {
  selecionarMelhorDroneParaPedido,
  calcularDistanciaKm,
  parseNumberSafe
};

// services/droneService.js
const { Drone } = require("../models/Drone");


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
  const R = 6371; 
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



async function selecionarMelhorDroneParaPedido({ coordX, coordY, pesoKg }) {
  const destinoLat = parseNumberSafe(coordX);
  const destinoLon = parseNumberSafe(coordY);
  const peso = parseNumberSafe(pesoKg);

  if (Number.isNaN(destinoLat) || Number.isNaN(destinoLon)) {
    throw new Error("coordX/coordY inválidos (devem ser números).");
  }
  if (Number.isNaN(peso)) {
    throw new Error("pesoKg inválido (deve ser número).");
  }

  const candidatos = await Drone.find({
    status: "disponivel",
    capacidadeMaxKg: { $gte: peso }
  }).lean();

  console.log("[droneService] candidatos encontrados:", candidatos.length);

  if (!candidatos || candidatos.length === 0) return null;
  if (candidatos.length === 1) {
    const only = candidatos[0];
    const lat = parseNumberSafe(only.coordX);
    const lon = parseNumberSafe(only.coordY);
    only._distanciaKm = Number.isNaN(lat) || Number.isNaN(lon)
      ? null
      : Number(calcularDistanciaKm(destinoLat, destinoLon, lat, lon).toFixed(3));
    return only;
  }

  const candidatosComCoords = [];
  const candidatosSemCoords = [];

  for (const c of candidatos) {
    const lat = parseNumberSafe(c.coordX);
    const lon = parseNumberSafe(c.coordY);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      candidatosSemCoords.push(c);
      continue;
    }
    const distKm = calcularDistanciaKm(destinoLat, destinoLon, lat, lon);
    candidatosComCoords.push({ ...c, _distanciaKm: Number(distKm.toFixed(3)) });
  }

  if (candidatosComCoords.length > 0) {
    candidatosComCoords.sort((a, b) => a._distanciaKm - b._distanciaKm);
    const melhor = candidatosComCoords[0];
    console.log("[droneService] melhor (com coords):", {
      id: melhor._id,
      distanciaKm: melhor._distanciaKm,
      coordX: melhor.coordX,
      coordY: melhor.coordY,
      capacidade: melhor.capacidadeMaxKg
    });
    return melhor;
  }


  console.log("[droneService] nenhum candidato tinha coords válidas; retornando primeiro candidato");
  return candidatosSemCoords[0] || candidatos[0];
}

module.exports = {
  selecionarMelhorDroneParaPedido,
  calcularDistanciaKm,
  parseNumberSafe
};

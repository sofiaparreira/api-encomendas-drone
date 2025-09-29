const { default: mongoose } = require("mongoose");
const { Fila: FilaModel } = require("../models/Fila");



async function getFilaByDroneId(req, res) {
  try {
    const droneId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(droneId)) {
      return res.status(400).json({ error: "ID de drone inválido" });
    }

    const fila = await FilaModel.findOne({ droneId })
      .populate({
        path: "entregas",
        populate: {
          path: "pedidos",
          model: "Pedido",
          populate: {
            path: "prioridadeId",
            model: "Prioridade",
            select: "nome valor"
          }
        }
      })
      .lean();

    if (!fila) {
      return res.status(404).json({ error: "Fila não encontrada para este drone" });
    }


    fila.entregas?.forEach(entrega => {
      entrega.pedidos = (entrega.pedidos || []).sort((a, b) => {
        const priA = Number(a.prioridadeId?.valor ?? Infinity);
        const priB = Number(b.prioridadeId?.valor ?? Infinity);
        if (priA !== priB) return priA - priB; 
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateA - dateB;
      });
    });

    return res.status(200).json(fila);
  } catch (error) {
    console.error("Erro getFilaByDroneId:", error);
    return res.status(500).json({ error: "Erro ao buscar a fila, contate o suporte" });
  }
}


module.exports = { getFilaByDroneId };

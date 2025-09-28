const { default: mongoose } = require("mongoose");
const { Fila: FilaModel } = require("../models/Fila");

async function getFilaByDroneId(req, res) {
  try {
    const droneId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(droneId)) {
      return res.status(400).json({ error: "ID de drone inválido" });
    }

    // Buscar a fila e popular apenas os campos corretos
    const fila = await FilaModel.findOne({ droneId })
      .populate({
        path: "entregas",               // entregas da fila
        populate: {
          path: "pedidos",              // pedidos dentro da entrega
          populate: { path: "prioridadeId", select: "nome valor" } // prioridade do pedido
        }
      })
      .lean(); // objeto simples, sem métodos do mongoose

    if (!fila) {
      return res.status(404).json({ error: "Fila não encontrada para este drone" });
    }

    // Ordenar pedidos dentro de cada entrega
    fila.entregas?.forEach(entrega => {
      entrega.pedidos?.sort((a, b) => {
        const priA = a.prioridadeId?.valor ?? 9999;
        const priB = b.prioridadeId?.valor ?? 9999;
        if (priA !== priB) return priA - priB;

        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
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

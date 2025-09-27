const { Prioridade: PrioridadeModel, Prioridade } = require("../models/Prioridade");

async function createPrioridade(req, res) {
  try {
    const { nome, valor, cor } = req.body;
    const exists = await PrioridadeModel.findOne({ nome });
    if (exists) {
      return res.status(400).json({ error: "Prioridade já existe" });
    }

    const prioridade = await PrioridadeModel.create({ nome, valor, cor });
    return res.status(200).json(prioridade);
  } catch (error) {
    console.error(`Erro ao criar prioridade: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro ao criar prioridade, contate o suporte" });
  }
}

async function getPrioridades(req, res) {
  try {
    const prioridades = await PrioridadeModel.find().sort({ valor: -1 }); 
    return res.status(200).json(prioridades);
  } catch (error) {
    console.error(`Erro ao buscar prioridades: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro ao buscar prioridades, contate o suporte" });
  }
}


async function deletePrioridade(req, res) {
  try {
    const { id } = req.params;
    const prioridade = await PrioridadeModel.findByIdAndDelete(id);

    if (!prioridade) {
      return res.status(404).json({ error: "Prioridade não encontrada" });
    }

    return res.status(200).json({ message: "Prioridade deletada com sucesso" });
  } catch (error) {
    console.error(`Erro ao deletar prioridade: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro ao deletar prioridade, contate o suporte" });
  }
}

module.exports = {
  createPrioridade,
  getPrioridades,
  deletePrioridade
};

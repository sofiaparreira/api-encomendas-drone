const mongoose = require("mongoose");

const { Schema } = mongoose;

const pedidoSchema = new Schema({
      enderecoDestino: {
        rua: {type: String},
        numero: {type: String},
        bairro: {type: String},
        cidade: String,
        estado: String,
        cep: String,
        coordX: {type: Number},
        coordY: {type: Number},
  },
  pesoKg: { type: String},
  status: {
    type: String,
        enum: ["pendente", "em_transporte", "entregue"],
        default: "pendente"
  },
  prioridadeId: {
    type: Schema.Types.ObjectId,
    ref: "Prioridade",
    required: true
  },
  
  droneId: {type: Schema.Types.ObjectId, ref: "Drone", required: true}
}, {timestamps: true})

const Pedido = mongoose.model("Pedido", pedidoSchema);
module.exports = {
    Pedido, pedidoSchema
};
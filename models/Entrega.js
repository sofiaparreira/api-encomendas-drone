// models/Entrega.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const entregaSchema = new Schema({
  drone: { type: Schema.Types.ObjectId, ref: 'Drone', required: true },

  pedidos: [{
    type: Schema.Types.ObjectId,
    ref: 'Pedido'
  }],

  totalPeso: { type: Number, default: 0, min: 0 },

  capacidadeRestante: { type: Number, required: true, min: 0 },
  droneMaxPayloadSnapshot: { type: Number, required: true, min: 0 },

  status: {
    type: String,
    enum: ['agendada', 'em_voo', 'concluida', 'cancelada'],
    default: 'agendada'
  },

  scheduledAt: { type: Date },
  startedAt: { type: Date },
  finishedAt: { type: Date }
}, {
  timestamps: true
});

const Entrega = mongoose.model("Entrega", entregaSchema);
module.exports = {
    Entrega, entregaSchema
};

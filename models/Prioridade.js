const mongoose = require("mongoose");

const { Schema } = mongoose;

const prioridadeSchema = new Schema({

  nome: { type: String, enum: ["baixa", "media", "alta"], required: true },
  valor: {type: Number, required: true },
  cor: {type: String, required: true}
    

}, { timestamps: true });

const Prioridade = mongoose.model("Prioridade", prioridadeSchema);


module.exports = {
    Prioridade, prioridadeSchema
}
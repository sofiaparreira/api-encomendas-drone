const mongoose = require("mongoose");

const { Schema } = mongoose;

const droneSchema = new Schema({

    nome: { type: String, required: true },
    capacidadeMaxKg: { type: Number, required: true }, // capacidade máxima de peso (kg)
    alcanceMaxKm: { type: Number, required: true }, // alcance máximo por carga 
    porcentagemBateria: { type: Number },
    coordX: { type: Number },
    coordY: { type: Number },
    status: {
        type: String,
        enum: ['disponivel', 'carregando', 'entregando', 'retornando', 'manutencao', 'reservado'],
        default: 'disponivel',
        required: true
    }, 
    velocidadeKMH: { type: Number }, // velocidade média p estimar tempo do voo
    tempoVooMax: { type: Number, required: true } // tempo de voo maximo por bateria (sem carga)

}, { timestamps: true });

const Drone = mongoose.model("Drone", droneSchema);
module.exports = {
    Drone, droneSchema
}
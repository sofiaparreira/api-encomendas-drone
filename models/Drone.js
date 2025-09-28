const mongoose = require("mongoose");

const { Schema } = mongoose;

const droneSchema = new Schema({
    nome: { type: String, required: true },
    capacidadeMaxKg: { type: Number, required: true }, // capacidade máxima de peso (kg)
    alcanceMaxKm: { type: Number, required: true }, // alcance máximo por carga 
    porcentagemBateria: { type: Number },
    
    // posição atual do drone
    coordX: { type: Number, default: 0 },
    coordY: { type: Number, default: 0 },

    // posição da base (home)
    homeCoordX: { type: Number, default: 0 },
    homeCoordY: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['disponivel', 'carregando', 'entregando', 'retornando', 'manutencao', 'reservado'],
        default: 'disponivel',
        required: true
    }, 

    velocidadeKMH: { type: Number }, // velocidade média p estimar tempo do voo
    tempoVooMax: { type: Number, required: true } // tempo de voo maximo por bateria (sem peso)
}, { timestamps: true });

const Drone = mongoose.model("Drone", droneSchema);
module.exports = {
    Drone, droneSchema
};

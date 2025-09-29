const mongoose = require("mongoose")
const { Schema } = mongoose;

const filaSchema = new Schema({
    droneId: { type: Schema.Types.ObjectId, ref: "Drone", required: true},
    entregas: [{ type: Schema.Types.ObjectId, ref: 'Entrega' }],
    status: {
        type: String,
        enum: ["aguardando", "voando"],
        default: "aguardando"
    },
}, { timestamps: true });

const Fila = mongoose.model("Fila", filaSchema);
module.exports = {
    Fila, filaSchema
};

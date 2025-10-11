const mongoose = require("mongoose");

async function main() {
    try {
        mongoose.set("strictQuery", true)
        await mongoose.connect(
            process.env.MONGODB_URI,
        );

        console.log("Conectado ao banco!")
    } catch (error) {
        console.log(`Erro: ${error}`)
    }
}

module.exports = main;

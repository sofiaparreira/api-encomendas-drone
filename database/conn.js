const mongoose = require("mongoose");

async function main() {
    try {
        mongoose.set("strictQuery", true)
        await mongoose.connect(
            "mongodb+srv://user_default:a123456@cluster0.ssv50h1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        );

        console.log("Conectado ao banco!")
    } catch (error) {
        console.log(`Erro: ${error}`)
    }
}

module.exports = main;
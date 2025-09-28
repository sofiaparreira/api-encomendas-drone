const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");

const { startWebSocket } = require("./utils/wsServer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conecta ao banco de dados
const connectDB = require("./database/conn");
(async () => {
  try {
    await connectDB();
    console.log("Banco de dados conectado com sucesso");
  } catch (err) {
    console.error("Erro ao conectar no banco:", err.message);
    process.exit(1);
  }
})();

// Rotas
const routes = require("./routes/router");
app.use(routes);

// Cria servidor HTTP a partir do Express
const server = http.createServer(app);

// Inicia WebSocket para simulação de voo
startWebSocket(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

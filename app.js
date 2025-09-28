const express = require("express");
const cors = require("cors");
require("dotenv").config(); 

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Routes
const routes = require("./routes/router");
app.use(routes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

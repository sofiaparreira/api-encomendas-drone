const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Database connection
const conn = require("./database/conn")
conn();


const routes = require("./routes/router")
app.use(routes);


app.listen(3000, function () {
    console.log("Servidor rodando na porta 3000")
})
const express = require("express");
const path = require("path");
const axios = require("axios");
const { consultarPlaca } = require("./placaserpro");

const app = express();
const PORT = process.env.PORT || 80;

const TOKENS_VALIDOS = ["KeyBesh"];
const TELEGRAM_TOKEN = "7901578120:AAFuSrfsGx2YtKUcHdK8rbEy9yDoq-Al2Z8";
const TELEGRAM_CHAT_ID = "8081423413";

async function enviarTelegram(mensagem) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem
    });
  } catch (err) {
    console.error("Erro ao enviar para Telegram:", err.response?.data || err.message);
  }
}

app.get("/api/placa", async (req, res) => {
  const { query, token } = req.query;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (!query) {
    res.status(400).json({ erro: "Parâmetro 'query' é obrigatório" });
    enviarTelegram(`🚫 Consulta bloqueada\nToken: ${token || "N/A"}\nErro: query ausente`);
    return;
  }

  if (!token) {
    res.status(401).json({ erro: "Token é obrigatório" });
    enviarTelegram(`🚫 Consulta bloqueada\nQuery: ${query}\nErro: token ausente`);
    return;
  }

  if (!TOKENS_VALIDOS.includes(token)) {
    res.status(403).json({ erro: "Token inválido ou não autorizado" });
    enviarTelegram(`🚫 Token inválido\nQuery: ${query}\nToken: ${token}`);
    return;
  }

  try {
    const resultado = await consultarPlaca(query);
    res.json({ sucesso: true, dados: resultado });
    enviarTelegram(`✅ Consulta realizada\nQuery: ${query}\nToken: ${token}\nStatus: Sucesso`);
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
    enviarTelegram(`❌ Erro na consulta\nQuery: ${query}\nToken: ${token}\nErro: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
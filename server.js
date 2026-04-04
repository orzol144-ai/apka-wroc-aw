import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 FUNKCJA DO GPT (żeby nie powielać kodu)
async function askAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt
    })
  });

  const data = await response.json();
  return data.output[0].content[0].text;
}

// 📍 PLAN DNIA
app.post("/plan", async (req, res) => {
  const styl = req.body.styl;

  const prompt = `
Stwórz szczegółowy plan dnia we Wrocławiu dla stylu: ${styl}.

WARUNKI:
- Aktualna pogoda: chłodno (~10°C)
- Unikaj roweru i długiego siedzenia na zewnątrz

WAŻNE:
- NIE powtarzaj typu miejsca pod rząd
- Plan ma być różnorodny (kawa → spacer → atrakcja → jedzenie)
- Naturalny flow dnia

Każdy punkt:
- godzina
- konkretne miejsce
- opis klimatu
- ciekawostka
- jak się dostać

Styl luźny jak od znajomego

FORMAT:
10:00
Opis...

11:30
Opis...
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd" });
  }
});

// 🍔 JESTEM GŁODNY
app.post("/food", async (req, res) => {

  const prompt = `
Znajdź dobre jedzenie we Wrocławiu.

Warunki:
- konkretne knajpy
- różne opcje (burger, pizza, coś lokalnego)
- krótki opis klimatu
- jak się dostać

Nie powtarzaj tego samego typu miejsca.

Styl luźny.

FORMAT:
Nazwa – opis...
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    res.status(500).json({ error: "Błąd" });
  }
});

// 😴 JESTEM ZMĘCZONY
app.post("/short", async (req, res) => {

  const prompt = `
Stwórz krótki plan dnia we Wrocławiu (max 3 punkty).

Warunki:
- mało chodzenia
- chill
- bardziej odpoczynek niż aktywność

FORMAT:
10:00 – coś
12:00 – coś
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    res.status(500).json({ error: "Błąd" });
  }
});

// 🚀 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
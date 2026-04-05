import express from "express";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 🔥 GPT helper
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

// 📍 PLAN DNIA MULTI OPCJE
app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu z WIELOMA OPCJAMI.

ZASADY:
- dzień 10:00–20:00
- MINIMUM 6 bloków (godzin)
- każdy blok = 3-5 opcji

FORMAT (BARDZO WAŻNY):

10:00
- Kawiarnia A – opis... Dojście...
- Kawiarnia B – opis... Dojście...
- Kawiarnia C – opis... Dojście...

11:30
- Atrakcja A – opis... Dojście...
- Atrakcja B – opis... Dojście...
- Atrakcja C – opis... Dojście...

13:00
- Jedzenie A – opis... Dojście...
- Jedzenie B – opis... Dojście...

ZASADY:
- miejsca blisko siebie
- logiczna trasa
- NIE powtarzaj typów
- dodaj ciekawostki

Styl: luźny
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    res.status(500).json({ error: "Błąd" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
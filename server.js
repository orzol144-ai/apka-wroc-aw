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

// 📍 PLAN ZE SLOTAMI
app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

Styl: ${styl}
Transport: ${transport}

ZWRÓĆ JSON (bez tekstu poza JSON):

{
  "kawa": [{ "name": "", "opis": "", "dojazd": "", "mapy": "" }],
  "jedzenie": [{ "name": "", "opis": "", "dojazd": "", "mapy": "" }],
  "spacer": [{ "name": "", "opis": "", "dojazd": "", "mapy": "" }],
  "atrakcja": [{ "name": "", "opis": "", "dojazd": "", "mapy": "" }]
}

WARUNKI:
- jeśli transport = auto → miejsca dalej + info o parkingu (czy płatny)
- jeśli komunikacja → podaj tramwaj/autobus
- jeśli pieszo → podaj czas spaceru
- pogoda chłodna (~10°C)
- unikaj powtarzania typów

mapy = link Google Maps
`;

  try {
    const text = await askAI(prompt);
    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd AI" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
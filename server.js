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

// 🚀 PLAN (NOWY – POD SWIPE)
app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

Styl: ${styl}
Transport: ${transport}

ZWRÓĆ TYLKO JSON (bez tekstu poza JSON):

{
  "kawa": [
    {
      "name": "Nazwa miejsca",
      "opis": "krótki klimat + ciekawostka",
      "dojazd": "jak się dostać (${transport})",
      "mapy": "link do google maps"
    }
  ],
  "jedzenie": [...],
  "spacer": [...],
  "atrakcja": [...]
}

WARUNKI:
- pogoda chłodna (~10°C)
- brak roweru
- miejsca realistyczne (Wrocław)
- NIE powtarzaj typów
- różnorodność

Każda kategoria: MIN 3 propozycje
`;

  try {
    let text = await askAI(prompt);

    // 🧹 czyszczenie JSONa
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// 🚀 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
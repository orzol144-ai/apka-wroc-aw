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
  const res = await fetch("https://api.openai.com/v1/responses", {
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

  const data = await res.json();
  return data.output[0].content[0].text;
}

// 🔥 GENERATOR OPCJI (NIE PLANU!)
app.post("/plan", async (req, res) => {
  const { styl } = req.body;

  const prompt = `
Stwórz LISTĘ 10-12 propozycji miejsc we Wrocławiu dla stylu: ${styl}

Zwróć JSON:

[
  {
    "miejsce": "Nazwa miejsca",
    "opis": "ciekawy opis + ciekawostka historyczna",
    "typ": "kawiarnia / atrakcja / jedzenie"
  }
]

ZASADY:
- różnorodne miejsca
- konkretne nazwy
- ciekawostki (rok, historia, unikalność)
- bez powtórek
- styl luźny
`;

  try {
    const raw = await askAI(prompt);
    const parsed = JSON.parse(raw);

    res.json({ list: parsed });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Błąd AI" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
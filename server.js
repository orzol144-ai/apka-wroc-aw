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

// 🔥 NOWY LEPSZY PLAN
app.post("/plan", async (req, res) => {
  const { styl } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

Zwróć TYLKO JSON:

[
  {
    "godzina": "10:00",
    "miejsce": "Nazwa miejsca",
    "opis": "Opis + ciekawostka historyczna + klimat miejsca",
    "dojscie": "jak dojść z poprzedniego miejsca (czas + ewentualnie tramwaj/autobus)"
  }
]

ZASADY:
- 6–8 punktów (pełny dzień)
- realna trasa (blisko siebie)
- różnorodność (kawa → spacer → atrakcja → jedzenie → coś ciekawego)
- NIE powtarzaj tego samego typu miejsca pod rząd

WAŻNE:
- dodawaj ciekawostki (rok powstania, historia, coś unikalnego)
- styl luźny, ale konkretny (jak znajomy poleca)

Styl: ${styl}
`;

  try {
    const raw = await askAI(prompt);
    const parsed = JSON.parse(raw);

    res.json({ plan: parsed });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Błąd AI" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
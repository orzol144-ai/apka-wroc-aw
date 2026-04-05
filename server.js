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

// 🔥 AI helper
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

// 🔥 PLAN DNIA (NOWY SYSTEM JSON)
app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

Zwróć TYLKO JSON (bez tekstu poza JSON)

FORMAT:
[
  {
    "godzina": "10:00",
    "miejsce": "Nazwa miejsca",
    "opis": "ciekawy opis + ciekawostka",
    "dojscie": "jak dojść z poprzedniego miejsca (czas + środek transportu)"
  }
]

ZASADY:
- max 6 punktów
- realna trasa (blisko siebie)
- NIE powtarzaj typów miejsc
- styl: ${styl}
- transport: ${transport}

WAŻNE:
- każdy kolejny punkt musi zawierać DOJŚCIE od poprzedniego
- np: "10 min pieszo" albo "tramwaj 9 → przystanek X"
`;

  try {
    const raw = await askAI(prompt);

    const parsed = JSON.parse(raw);

    res.json({ plan: parsed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
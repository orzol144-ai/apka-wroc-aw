import express from "express";
import cors from "cors";
import path from "path";

const app = express();
const __dirname = new URL('.', import.meta.url).pathname;

app.use(cors());
app.use(express.json());

// 🔥 serwowanie plików z /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- AI ----------------
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
  return data.output?.[0]?.content?.[0]?.text || "";
}

// ---------------- POGODA ----------------
async function getWeather() {
  const res = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=51.11&longitude=17.03&current_weather=true"
  );
  const data = await res.json();

  return {
    temp: data.current_weather?.temperature || 0
  };
}

// ---------------- PARSER ----------------
function parsePlan(text) {
  const blocks = text.split("\n\n");

  return blocks.map(block => {
    const lines = block.split("\n");

    const title = lines[0] || "";
    const miejsce = title.split("–")[1]?.trim() || "Miejsce";

    const opis = lines.slice(1).join(" ").trim();

    return { miejsce, opis };
  }).filter(x => x.miejsce && x.opis);
}

// ---------------- API ----------------
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    const prompt = `
Plan dnia we Wrocławiu.

STYL: ${styl}
POGODA: ${weather.temp}°C

Zasady:
- 10 miejsc
- dostosuj do pogody
- mix: jedzenie + atrakcje + chill

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...
`;

    let wynik = await askAI(prompt);

    if (!wynik || wynik.length < 50) {
      wynik = `
10:00 – Rynek Wrocław
Centrum miasta.
Dojście: start

11:30 – Ostrów Tumski
Klimatyczne miejsce.
Dojście: 10 min
`;
    }

    const list = parsePlan(wynik);

    res.json({ list, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
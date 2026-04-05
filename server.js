import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json());

// 📁 pseudo baza danych
const DB_FILE = "plans.json";

function loadPlans() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE));
  } catch {
    return [];
  }
}

function savePlans(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 🔥 FRONT
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 🔥 pamięć anty powtórki
let usedPlaces = [];

// 🌦️ pogoda
async function getWeather() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=51.11&longitude=17.03&current_weather=true"
    );
    const data = await res.json();
    return { temp: data.current_weather?.temperature || 15 };
  } catch {
    return { temp: 15 };
  }
}

// 🧠 GENEROWANIE PLANU
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();
    const temp = weather.temp;

    const banned = usedPlaces.slice(-30).join(", ");

    const prompt = `
Jesteś lokalnym przewodnikiem po Wrocławiu.

Tworzysz realistyczny plan dnia jak człowiek.

STYL: ${styl}
TEMPERATURA: ${temp}°C

ZASADY:
- NIE używaj tych miejsc: ${banned}
- nie powtarzaj miejsc
- zero ogólników

TRANSPORT:
- zawsze szczegółowo:
  pieszo → "8 min pieszo Mostem Tumskim"
  tramwaj → "tramwaj nr 8 z Rynek → Plac Grunwaldzki (10 min + 3 min pieszo)"

OPIS:
- co zrobić
- co zjeść
- ciekawostka

WIECZÓR:
- zimno → indoor
- brak spacerów po 20

FORMAT JSON:
[
  {
    "miejsce":"nazwa",
    "opis":"opis",
    "dojscie":"transport",
    "czas_pobytu":"45 min",
    "lat":51.1,
    "lon":17.0
  }
]
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await aiRes.json();
    const text = data.output?.[0]?.content?.[0]?.text || "[]";

    let plan = [];

    try {
      plan = JSON.parse(text);
    } catch {}

    if (!Array.isArray(plan) || !plan.length) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Serce miasta z klimatem i restauracjami.",
          dojscie: "start",
          czas_pobytu: "45 min",
          lat: 51.109,
          lon: 17.032
        }
      ];
    }

    // zapis anty powtórek
    plan.forEach(p => usedPlaces.push(p.miejsce));

    if (usedPlaces.length > 100) {
      usedPlaces = usedPlaces.slice(-50);
    }

    res.json({ list: plan, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

// 💾 ZAPIS PLANU
app.post("/save", (req, res) => {
  const plans = loadPlans();
  plans.push(req.body);
  savePlans(plans);
  res.json({ ok: true });
});

// 📜 HISTORIA
app.get("/history", (req, res) => {
  res.json(loadPlans());
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Server działa:", PORT));
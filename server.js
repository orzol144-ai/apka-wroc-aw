import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 🔥 PAMIĘĆ (anty powtórki)
let usedPlaces = [];

// 🌦️ POGODA
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

// 🧠 PLAN
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();
    const temp = weather.temp;

    const banned = usedPlaces.slice(-20).join(", ");

    const prompt = `
Jesteś lokalnym przewodnikiem po Wrocławiu.

Tworzysz REALNY plan dnia.

STYL: ${styl}
TEMPERATURA: ${temp}°C

WAŻNE:
- NIE używaj tych miejsc: ${banned}
- NIE powtarzaj miejsc
- mieszaj znane i mniej znane miejsca
- unikaj urzędów i bezsensownych punktów

POGODA:
- zimno → więcej indoor
- ciepło → spacery OK

WIECZÓR:
- po 20:00:
  - jeśli zimno → tylko indoor
  - możesz zakończyć plan o 20

KAŻDY PUNKT:
- konkret co robić
- ciekawostka
- dojście
- czas pobytu
- lat, lon

FORMAT JSON:
[
  {
    "miejsce": "nazwa",
    "opis": "opis",
    "dojscie": "8 min pieszo",
    "czas_pobytu": "45 min",
    "lat": 51.1,
    "lon": 17.0
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

    // 🔥 fallback
    if (!Array.isArray(plan) || plan.length === 0) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Serce miasta z klimatem kamienic.",
          dojscie: "start",
          czas_pobytu: "45 min",
          lat: 51.109,
          lon: 17.032
        }
      ];
    }

    // 🔥 zapis użytych miejsc
    plan.forEach(p => {
      if (p.miejsce) {
        usedPlaces.push(p.miejsce);
      }
    });

    // 🔥 limit pamięci (żeby nie rosło w nieskończoność)
    if (usedPlaces.length > 100) {
      usedPlaces = usedPlaces.slice(-50);
    }

    res.json({ list: plan, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
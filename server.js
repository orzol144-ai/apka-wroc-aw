import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

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

// 🚀 PLAN
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    const prompt = `
Jesteś lokalnym przewodnikiem po Wrocławiu.

Tworzysz REALNY plan dnia.

STYL: ${styl}

ZASADY:
- tylko realne miejsca
- zero urzędów, informacji turystycznych itd
- plan ma być ciekawy i logiczny
- unikaj powtarzalnych miejsc

TRASA:
- podawaj konkret:
  - "8 min pieszo Mostem Tumskim"
  - "tramwaj 2 (Rynek → Plac Grunwaldzki)"

NIE PODAWAJ GODZIN OTWARCIA JEŚLI NIE JESTEŚ PEWNY

KAŻDY PUNKT:
- miejsce
- opis (ciekawostka / historia)
- dojście
- czas pobytu
- współrzędne (lat, lon)

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

    res.json({ list: plan, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
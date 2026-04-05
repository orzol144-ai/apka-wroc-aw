import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 FRONT
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

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

// 🧠 PLAN DNIA
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();
    const temp = weather.temp;

    const prompt = `
Jesteś lokalnym przewodnikiem po Wrocławiu.

Tworzysz REALNY, PRZEMYŚLANY plan dnia.

STYL: ${styl}
TEMPERATURA: ${temp}°C

ZASADY:
- plan ma być logiczny jak od człowieka
- NIE powtarzaj popularnych miejsc
- mieszaj znane i mniej znane miejsca
- unikaj urzędów, informacji turystycznych itd

POGODA:
- jeśli zimno (<15°C) → więcej indoor
- jeśli ciepło → spacery OK

WIECZÓR:
- po 20:00:
  - NIE dawaj parków jeśli zimno
  - dawaj bary, knajpy, miejsca indoor
- jeśli zimno → możesz zakończyć plan o 20:00

FLOW:
10:00 kawa
12:00 atrakcja
14:00 jedzenie
16:00 atrakcja
18:00 kolacja
20:00 zakończenie (bar / klimat / indoor)

KAŻDY PUNKT:
- konkret co robić (np co zjeść)
- ciekawostka lub klimat miejsca
- konkretne dojście (np "8 min pieszo Mostem Tumskim")
- czas pobytu
- współrzędne (lat, lon)

FORMAT JSON:
[
  {
    "miejsce": "nazwa",
    "opis": "konkret + ciekawostka",
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
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // 🔥 fallback (żeby nigdy nie było pustki)
    if (!Array.isArray(plan) || plan.length === 0) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Centralny punkt miasta z klimatycznymi kamienicami i restauracjami.",
          dojscie: "start",
          czas_pobytu: "45 min",
          lat: 51.109,
          lon: 17.032
        }
      ];
    }

    res.json({ list: plan, weather });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "error" });
  }
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa na porcie:", PORT));
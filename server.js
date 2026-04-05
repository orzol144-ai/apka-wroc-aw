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

Tworzysz REALNY, PRZEMYŚLANY plan dnia — jak zrobiłby to człowiek.

STYL: ${styl}
TEMPERATURA: ${temp}°C

---

ZASADY:

- NIE używaj tych miejsc: ${banned}
- NIE powtarzaj miejsc
- unikaj ogólników
- plan musi mieć sens i flow

---

TRANSPORT (KRYTYCZNE):

ZAWSZE podawaj szczegóły:

JEŚLI BLISKO:
→ "8 min pieszo Mostem Tumskim"

JEŚLI DALEJ:
→ "tramwaj nr 8 z przystanku „Rynek” do „Plac Grunwaldzki” (10 min + 3 min pieszo)"

ZABRONIONE:
❌ "10 min pieszo"
❌ "tramwaj"

MUSI BYĆ:
✔ numer tramwaju
✔ nazwy przystanków
✔ czas

---

POGODA:

- zimno → indoor
- ciepło → spacery OK

---

WIECZÓR:

- po 20:00:
  - jeśli zimno → tylko indoor
  - brak spacerów
- możesz zakończyć plan o 20:00

---

OPISY:

Każdy punkt MUSI mieć:

- co dokładnie zrobić
- co zjeść / zobaczyć
- ciekawostkę

ZAKAZ:
❌ "fajne miejsce"
❌ ogólniki

---

FLOW:

10:00 kawa
12:00 atrakcja
14:00 jedzenie
16:00 atrakcja
18:00 kolacja
20:00 zakończenie

---

FORMAT JSON:

[
  {
    "miejsce": "nazwa",
    "opis": "konkretny opis + ciekawostka",
    "dojscie": "dokładny transport",
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

    // 🔥 fallback
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

    // 🔥 zapis pamięci
    plan.forEach(p => {
      if (p.miejsce) usedPlaces.push(p.miejsce);
    });

    if (usedPlaces.length > 100) {
      usedPlaces = usedPlaces.slice(-50);
    }

    res.json({ list: plan, weather });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "error" });
  }
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
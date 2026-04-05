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

// 🌦️ POGODA (Open-Meteo – darmowe)
async function getWeather() {
  const res = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=51.11&longitude=17.03&current_weather=true"
  );
  const data = await res.json();

  const temp = data.current_weather.temperature;
  const wind = data.current_weather.windspeed;

  return { temp, wind };
}

// 🧠 AI
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

// 🔥 parser
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

app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    const prompt = `
Tworzysz plan dnia we Wrocławiu.

STYL: ${styl}

POGODA:
- temperatura: ${weather.temp}°C
- wiatr: ${weather.wind} km/h

ZASADY:
- dostosuj plan do pogody:
  - zimno/deszcz → więcej miejsc wewnątrz
  - ciepło → spacery, bulwary, outdoor
- 10 propozycji (różnorodne!)

MIX:
- restauracje
- kawiarnie
- atrakcje
- miejsca chill

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...

WAŻNE:
- miejsca REALNE (Wrocław)
- brak gwiazdek **
`;

    let wynik = await askAI(prompt);

    if (!wynik || wynik.length < 50) {
      wynik = `
10:00 – Rynek Wrocław
Serce miasta.
Dojście: start

11:30 – Kawiarnia Central Cafe
Kawa i chill.
Dojście: 2 min

13:00 – Hala Targowa
Jedzenie lokalne.
Dojście: 5 min

14:30 – Panorama Racławicka
Atrakcja.
Dojście: 10 min

16:00 – Bulwary Odry
Spacer.
Dojście: 8 min

18:00 – Restauracja Bernard
Kolacja.
Dojście: 12 min
`;
    }

    const list = parsePlan(wynik);

    res.json({
      list,
      weather
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
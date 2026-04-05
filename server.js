import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 SERWOWANIE INDEX (BEZ PUBLIC)
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 🔥 AI
async function askAI(prompt) {
  try {
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
  } catch (e) {
    console.error("AI ERROR:", e);
    return "";
  }
}

// 🌦️ POGODA
async function getWeather() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=51.11&longitude=17.03&current_weather=true"
    );
    const data = await res.json();

    return {
      temp: data.current_weather?.temperature || 15
    };
  } catch {
    return { temp: 15 };
  }
}

// 🔥 PARSER
function parsePlan(text) {
  if (!text) return [];

  const blocks = text.split("\n\n");

  return blocks.map(block => {
    const lines = block.split("\n");

    const title = lines[0] || "";
    const miejsce = title.split("–")[1]?.trim() || "Miejsce";

    const opis = lines.slice(1).join(" ").trim();

    return { miejsce, opis };
  }).filter(x => x.miejsce && x.opis);
}

// 🚀 API
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    console.log("PLAN REQUEST:", styl);

    const weather = await getWeather();

    const prompt = `
Plan dnia we Wrocławiu.

STYL: ${styl}
POGODA: ${weather.temp}°C

ZASADY:
- 10 miejsc
- dopasuj do pogody
- mix: restauracje, kawiarnie, atrakcje

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...
`;

    let wynik = await askAI(prompt);

    console.log("AI RAW:", wynik);

    // 🔥 fallback (ważne!)
    if (!wynik || wynik.length < 50) {
      wynik = `
10:00 – Rynek Wrocław
Centrum miasta i start planu.
Dojście: start

11:30 – Ostrów Tumski
Klimatyczna część miasta.
Dojście: 10 min pieszo

13:00 – Hala Targowa
Jedzenie i klimat.
Dojście: 5 min

14:30 – Panorama Racławicka
Duża atrakcja.
Dojście: 10 min

16:00 – Bulwary Odry
Spacer i chill.
Dojście: 8 min

18:00 – Restauracja Bernard
Kolacja.
Dojście: 12 min
`;
    }

    const list = parsePlan(wynik);

    console.log("PARSED:", list.length);

    res.json({ list, weather });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa na porcie", PORT));
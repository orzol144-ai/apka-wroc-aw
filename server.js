import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 NAJPROSTSZY I NAJPEWNIEJSZY ROOT
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 🔥 TEST
app.get("/test", (req, res) => {
  res.send("OK");
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

  return text.split("\n\n").map(block => {
    const lines = block.split("\n");

    const miejsce = (lines[0]?.split("–")[1] || "").trim();
    const opis = lines.slice(1).join(" ").trim();

    return { miejsce, opis };
  }).filter(x => x.miejsce && x.opis);
}

// 🚀 API
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    const prompt = `
Plan dnia Wrocław.

STYL: ${styl}
POGODA: ${weather.temp}°C

10 miejsc. Mix atrakcji, jedzenia, kawiarni.

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...
`;

    let wynik = await askAI(prompt);

    if (!wynik || wynik.length < 50) {
      wynik = `
10:00 – Rynek Wrocław
Start planu.
Dojście: start

12:00 – Ostrów Tumski
Spacer.
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
app.listen(PORT, () => console.log("Server działa:", PORT));
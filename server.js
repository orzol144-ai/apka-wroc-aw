import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

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

// 🚀 PLAN DNIA (NOWA LOGIKA)
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    const prompt = `
Jesteś lokalnym przewodnikiem po Wrocławiu.

Tworzysz JEDEN SPÓJNY PLAN DNIA jak doświadczenie.

STYL: ${styl}

ZASADY:
- tylko REALNE miejsca
- zero losowych rzeczy typu "informacja turystyczna"
- plan ma mieć klimat i sens
- każde miejsce ma wynikać z poprzedniego
- ma to być coś co zrobi efekt "wow"

KAŻDY PUNKT:
- nazwa miejsca
- ciekawostka / historia / co tam robić
- czas dojścia (np. 8 min pieszo)

FLOW:
10:00 start (kawa / klimat)
12:00 atrakcja
14:00 jedzenie
16:00 atrakcja
18:00 kolacja
20:00 spacer / klimat
22:00 opcjonalnie coś wieczornego

STYL:
- leniwy → centrum, mało chodzenia
- aktywny → więcej chodzenia + mniej oczywiste miejsca + widoki / natura
- romantyczny → klimat, spacery, kolacja

FORMAT JSON:
[
  {
    "miejsce": "nazwa",
    "opis": "opis z ciekawostką",
    "czas": "10 min pieszo"
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
    } catch {
      plan = [];
    }

    if (!plan.length) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Jedno z największych rynków w Europie z gotyckim ratuszem.",
          czas: "start"
        }
      ];
    }

    res.json({ list: plan, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
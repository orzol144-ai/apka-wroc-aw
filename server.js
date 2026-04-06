import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json());

// 📁 pseudo baza
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

// 🔁 pamięć
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

// 🧠 AI CALL
async function generatePlan(prompt) {
  const res = await fetch("https://api.openai.com/v1/responses", {
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

  const data = await res.json();
  return data.output?.[0]?.content?.[0]?.text || "[]";
}

// 🧠 ENDPOINT
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();
    const banned = usedPlaces.slice(-30).join(", ");

    const styleBlock =
      styl === "leniwy" ? "STYL: LENIWY" :
      styl === "aktywny" ? "STYL: AMBITNY" :
      "STYL: ROMANTYCZNY";

    const prompt = `
${styleBlock}

Jesteś lokalnym mieszkańcem Wrocławia i planujesz dzień dla znajomego.

To NIE jest lista atrakcji.
To ma być dzień, który faktycznie byś komuś ułożył.

---

ZASADY:

- NIE używaj tych miejsc: ${banned}
- używaj tylko realnych miejsc
- NIE wymyślaj nazw

---

FLOW DNIA:

- zaczynasz od kawy (zawsze)
- potem dzień rozwija się naturalnie
- 1 miejsce z jedzeniem w środku dnia
- reszta to atrakcje

---

TRANSPORT:

- zawsze podaj jak się przemieścić
- np:
  "8 min pieszo przez most"
  "tramwaj nr 8 z Rynek → Plac Grunwaldzki (10 min + 3 min pieszo)"

---

LOGIKA:

- każdy punkt musi wynikać z poprzedniego
- napisz DLACZEGO tam idziemy

---

STRUKTURA (JSON):

[
  {
    "miejsce": "",
    "opis": "",
    "dlaczego": "",
    "dojscie": "",
    "czas_pobytu": ""
  }
]

---

STYL:

- pisz jak znajomy
- vibe: "chodź tu, bo..."
- zero sztucznego języka

---

Zwróć WYŁĄCZNIE JSON.
`;

    const rawPlan = await generatePlan(prompt);

    function safeParse(text) {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    let plan = safeParse(rawPlan) || [];

    if (!Array.isArray(plan) || plan.length < 3) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Start dnia w centrum miasta",
          dlaczego: "To naturalny punkt startowy",
          dojscie: "start",
          czas_pobytu: "45 min"
        },
        {
          miejsce: "Ostrów Tumski",
          opis: "Spacer po klimatycznej części miasta",
          dlaczego: "Blisko i zupełnie inny klimat",
          dojscie: "15 min pieszo",
          czas_pobytu: "60 min"
        }
      ];
    }

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

// 💾 zapis
app.post("/save", (req, res) => {
  const plans = loadPlans();
  plans.push(req.body);
  savePlans(plans);
  res.json({ ok: true });
});

// 📜 historia
app.get("/history", (req, res) => {
  res.json(loadPlans());
});

// 🚀 start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Server działa:", PORT));
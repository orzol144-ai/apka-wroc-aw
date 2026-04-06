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

// 🔁 pamięć anty powtórki
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

// 🧪 WALIDACJA PLANU
async function validatePlan(planText) {
  const validationPrompt = `
Przeanalizuj i popraw plan dnia:

${planText}

Sprawdź:
- realność miejsc
- logikę trasy
- flow dnia
- powtórzenia

Popraw jeśli trzeba i zwróć FINALNY JSON.
`;

  return await generatePlan(validationPrompt);
}

// 🧠 ENDPOINT
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();
    const temp = weather.temp;

    const banned = usedPlaces.slice(-30).join(", ");

    const styleBlock =
      styl === "leniwy" ? "STYL: LENIWY" :
      styl === "aktywny" ? "STYL: AMBITNY" :
      "STYL: ROMANTYCZNY";

    const prompt = `
${styleBlock}

Jesteś lokalnym mieszkańcem miasta, który planuje dzień dla znajomego.

Twoim celem jest stworzenie realistycznego dnia, który ma sens logistycznie i energetycznie.

---

ZASADY:

- NIE używaj tych miejsc: ${banned}
- używaj tylko realnych miejsc
- brak wymyślania
- max 1 jedzenie
- min 4 atrakcje
- logiczna trasa
- naturalny flow
- brak sztywnych godzin

---

STRUKTURA:

dla każdego punktu:
- miejsce
- opis
- dojście
- czas_pobytu

---

Zwróć JSON.
`;

    // 🔥 STEP 1
    let rawPlan = await generatePlan(prompt);

    // 🔥 STEP 2 (walidacja)
    let validated = await validatePlan(rawPlan);

    let plan = [];

    try {
      plan = JSON.parse(validated);
    } catch {
      try {
        plan = JSON.parse(rawPlan);
      } catch {}
    }

    if (!Array.isArray(plan) || !plan.length) {
      plan = [
        {
          miejsce: "Rynek Wrocław",
          opis: "Start dnia w centrum miasta",
          dojscie: "start",
          czas_pobytu: "45 min",
          lat: 51.109,
          lon: 17.032
        }
      ];
    }

    plan.forEach(p => usedPlaces.push(p.miejsce));
    if (usedPlaces.length > 100) usedPlaces = usedPlaces.slice(-50);

    res.json({ list: plan, weather });

  } catch (err) {
    console.error(err);
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
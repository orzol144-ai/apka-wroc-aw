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

// 🧠 GPT helper (bez crashy)
async function askAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
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

  const data = await response.json();

  return data.output?.[0]?.content?.[0]?.text || "Brak odpowiedzi 😢";
}

//
// 📍 PLAN DNIA
//
app.post("/plan", async (req, res) => {
  const styl = req.body.styl;

  const prompt = `
Stwórz szczegółowy plan dnia we Wrocławiu dla stylu: ${styl}.

WARUNKI:
- chłodno (~10°C)
- unikaj roweru
- mieszaj aktywności

WAŻNE:
- NIE powtarzaj typów miejsc pod rząd
- flow dnia: kawa → spacer → atrakcja → jedzenie

Każdy punkt:
- godzina
- konkretne miejsce (nazwa)
- opis klimatu
- ciekawostka
- jak się dostać

Styl luźny

FORMAT:
10:00
Opis...

11:30
Opis...
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd planu" });
  }
});

//
// 🍔 JEDZENIE Z GPS (NAPRAWIONE)
//
app.post("/food", async (req, res) => {

  const { lat, lon } = req.body;

  const prompt = `
Znajdź dobre jedzenie BLISKO tej lokalizacji:
Lat: ${lat}
Lon: ${lon}

WARUNKI:
- miejsca w zasięgu spaceru
- konkretne knajpy (nazwy!)
- różne typy (burger, pizza, lokalne)
- podaj ile minut pieszo
- krótki opis

Styl luźny

FORMAT:
Nazwa – opis + ile minut pieszo
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd food" });
  }
});

//
// 😴 SKRÓCONY PLAN
//
app.post("/short", async (req, res) => {

  const prompt = `
Stwórz krótki plan dnia we Wrocławiu (max 3 punkty).

WARUNKI:
- mało chodzenia
- chill
- odpoczynek

FORMAT:
10:00 – coś
12:00 – coś
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd short" });
  }
});

//
// 🚀 START
//
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
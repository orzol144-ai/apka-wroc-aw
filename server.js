import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

// ROOT
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// TEST
app.get("/test", (req, res) => {
  res.send("OK");
});

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

// 🔥 REALNE MIEJSCA
async function getPlaces(type) {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (
    node["amenity"="${type}"](area.searchArea);
  );
  out body;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query
    });

    const data = await res.json();

    return data.elements
      .filter(p => p.tags && p.tags.name)
      .slice(0, 10)
      .map(p => ({
        miejsce: p.tags.name,
        opis: "",
        lat: p.lat,
        lon: p.lon,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      }));

  } catch {
    return [];
  }
}

// 🧠 AI OPISY + OPINIE
async function enrichPlacesWithAI(places) {
  try {
    const prompt = `
Dla każdej nazwy miejsca stwórz krótki, ciekawy opis.

Zasady:
- 1-2 zdania
- ciekawostka / klimat / unikalność
- restauracja → jedzenie
- kawiarnia → klimat
- miejsce historyczne → historia

DODAJ:
- realistyczną liczbę opinii

Zwróć JSON:
[
  {
    "miejsce": "nazwa",
    "opis": "opis",
    "opinie": 1234
  }
]

Miejsca:
${places.map(p => p.miejsce).join("\n")}
`;

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
    const text = data.output?.[0]?.content?.[0]?.text || "[]";

    let parsed = [];

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }

    return places.map(p => {
      const found = parsed.find(x => x.miejsce === p.miejsce);

      return {
        ...p,
        opis: found?.opis || "Ciekawe miejsce warte odwiedzenia.",
        opinie: found?.opinie || Math.floor(Math.random()*2000+200)
      };
    });

  } catch {
    return places.map(p => ({
      ...p,
      opis: "Ciekawe miejsce warte odwiedzenia.",
      opinie: Math.floor(Math.random()*2000+200)
    }));
  }
}

// 🚀 API
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    let type = "cafe";
    if (styl === "aktywny") type = "fast_food";
    if (styl === "romantyczny") type = "restaurant";
    if (styl === "leniwy") type = "cafe";

    let places = await getPlaces(type);

    // fallback
    if (!places.length) {
      places = [
        { miejsce: "Rynek Wrocław", lat: 51.109, lon: 17.032 },
        { miejsce: "Ostrów Tumski", lat: 51.114, lon: 17.046 }
      ];
    }

    // 🔥 AI enrichment
    places = await enrichPlacesWithAI(places);

    res.json({ list: places, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
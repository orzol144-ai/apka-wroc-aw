import express from "express";
import cors from "cors";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

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
    return { temp: data.current_weather?.temperature || 15 };
  } catch {
    return { temp: 15 };
  }
}

// 🔥 ATRAKCJE
async function getAttractions() {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (node["tourism"](area.searchArea););
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
      .slice(0, 30)
      .map(p => ({
        miejsce: p.tags.name,
        lat: p.lat,
        lon: p.lon,
        typ: "attraction",
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      }));
  } catch {
    return [];
  }
}

// 🔥 FOOD
async function getFoodPlaces() {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (node["amenity"~"restaurant|cafe|fast_food"](area.searchArea););
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
      .slice(0, 50)
      .map(p => ({
        miejsce: p.tags.name,
        lat: p.lat,
        lon: p.lon,
        typ:
          ["restaurant", "fast_food"].includes(p.tags.amenity)
            ? "food"
            : "coffee",
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      }));
  } catch {
    return [];
  }
}

// 🔥 FLOW — PROSTY I NIEZAWODNY
function buildSmartFlow(allPlaces) {
  const result = [];

  for (let i = 0; i < allPlaces.length; i++) {
    if (!result.find(x => x.miejsce === allPlaces[i].miejsce)) {
      result.push(allPlaces[i]);
    }
    if (result.length >= 10) break;
  }

  return result;
}

// 🧠 AI (konkret)
async function enrichPlacesWithAIStyled(places, styl) {
  try {
    const prompt = `
Opisz miejsca konkretnie (1 zdanie, bez metafor).

Styl: ${styl}

Powiedz:
- co tam jest
- co warto zrobić / zjeść

Zwróć JSON:
[
  { "miejsce": "nazwa", "opis": "opis", "opinie": 1234 }
]

Miejsca:
${places.map(p => p.miejsce).join("\n")}
`;

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
    const text = data.output?.[0]?.content?.[0]?.text || "[]";

    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {}

    return places.map(p => {
      const found = parsed.find(x => x.miejsce === p.miejsce);

      return {
        ...p,
        opis: found?.opis || "Popularne miejsce, warto odwiedzić.",
        opinie: found?.opinie || Math.floor(Math.random()*2000+200)
      };
    });

  } catch {
    return places;
  }
}

// 🚀 API
app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const weather = await getWeather();

    let attractions = await getAttractions();
    let food = await getFoodPlaces();

    let allPlaces = [
      ...attractions,
      ...food,
      ...attractions // boost
    ];

    // shuffle
    allPlaces.sort(() => Math.random() - 0.5);

    let places = buildSmartFlow(allPlaces);

    // 🔥 HARD FIX — zawsze minimum
    if (places.length < 6) {
      places = [
        { miejsce: "Rynek Wrocław", lat: 51.109, lon: 17.032, typ: "attraction" },
        { miejsce: "Ostrów Tumski", lat: 51.114, lon: 17.046, typ: "attraction" },
        { miejsce: "Hala Targowa", lat: 51.111, lon: 17.041, typ: "food" },
        { miejsce: "Panorama Racławicka", lat: 51.110, lon: 17.044, typ: "attraction" },
        { miejsce: "Bulwary nad Odrą", lat: 51.108, lon: 17.035, typ: "attraction" },
        { miejsce: "Bernard", lat: 51.109, lon: 17.032, typ: "food" }
      ];
    }

    places = await enrichPlacesWithAIStyled(places, styl);

    res.json({ list: places, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
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

    return { temp: data.current_weather?.temperature || 15 };
  } catch {
    return { temp: 15 };
  }
}

// 🔥 LEPSZE MIEJSCA (FILTER + TYP)
async function getPlaces(type) {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (
    node["amenity"~"${type}|restaurant|cafe|fast_food"](area.searchArea);
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
      .filter(p => p.tags.name.length > 3)
      .slice(0, 30)
      .map(p => ({
        miejsce: p.tags.name,
        lat: p.lat,
        lon: p.lon,
        typ:
          ["restaurant", "fast_food"].includes(p.tags.amenity)
            ? "food"
            : p.tags.amenity === "cafe"
            ? "coffee"
            : "attraction",
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      }));

  } catch {
    return [];
  }
}

// 🔥 LOGICZNY FLOW DNIA
function buildSmartFlow(places) {
  const food = places.filter(p => p.typ === "food");
  const coffee = places.filter(p => p.typ === "coffee");
  const attr = places.filter(p => p.typ === "attraction");

  const result = [];

  result.push(...attr.slice(0, 2)); // start

  if (coffee[0]) result.push(coffee[0]);

  result.push(...attr.slice(2, 4));

  if (food[0]) result.push(food[0]);

  if (coffee[1]) result.push(coffee[1]);

  if (food[1]) result.push(food[1]);

  return result.slice(0, 8);
}

// 🧠 AI OPIS (REALISTYCZNY)
async function enrichPlacesWithAIStyled(places, styl) {
  try {
    const prompt = `
Opisz miejsca REALISTYCZNIE.

Zasady:
- 1 zdanie
- bez wymyślania bajek
- konkretnie

Styl: ${styl}

Dodaj:
- liczba opinii

JSON:
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
    } catch {}

    return places.map(p => {
      const found = parsed.find(x => x.miejsce === p.miejsce);

      return {
        ...p,
        opis: found?.opis || "Miejsce warte odwiedzenia.",
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

    let allPlaces = [];

    const baseTypes =
      styl === "aktywny"
        ? ["fast_food", "restaurant"]
        : styl === "romantyczny"
        ? ["restaurant", "cafe"]
        : ["cafe"];

    for (let t of baseTypes) {
      const places = await getPlaces(t);
      allPlaces = allPlaces.concat(places);
    }

    allPlaces.sort(() => Math.random() - 0.5);

    let places = buildSmartFlow(allPlaces);

    if (!places.length) {
      places = [
        { miejsce: "Rynek Wrocław", lat: 51.109, lon: 17.032 },
        { miejsce: "Ostrów Tumski", lat: 51.114, lon: 17.046 }
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
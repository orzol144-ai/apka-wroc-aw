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
  (
    node["tourism"](area.searchArea);
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
      .slice(0, 25)
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

// 🔥 JEDZENIE / KAWA
async function getFoodPlaces() {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (
    node["amenity"~"restaurant|cafe|fast_food"](area.searchArea);
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
      .slice(0, 40)
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

// 🔥 NOWY FLOW (ODPORNY – zawsze pełny plan)
function buildSmartFlow(places) {
  const food = places.filter(p => p.typ === "food");
  const coffee = places.filter(p => p.typ === "coffee");
  const attr = places.filter(p => p.typ === "attraction");

  const result = [];

  if (attr[0]) result.push(attr[0]);
  if (attr[1]) result.push(attr[1]);

  if (coffee[0]) result.push(coffee[0]);
  else if (attr[2]) result.push(attr[2]);

  if (attr[3]) result.push(attr[3]);

  if (food[0]) result.push(food[0]);
  else if (coffee[1]) result.push(coffee[1]);

  if (attr[4]) result.push(attr[4]);

  if (coffee[2]) result.push(coffee[2]);
  else if (food[1]) result.push(food[1]);

  // 🔥 fallback – zawsze dobija do min 8 miejsc
  let i = 0;
  while (result.length < 8 && i < places.length) {
    const p = places[i];
    if (!result.find(x => x.miejsce === p.miejsce)) {
      result.push(p);
    }
    i++;
  }

  return result.slice(0, 10);
}

// 🧠 AI
async function enrichPlacesWithAIStyled(places, styl) {
  try {
    const prompt = `
Opisz miejsca REALISTYCZNIE (1 zdanie).

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

    const attractions = await getAttractions();
    const food = await getFoodPlaces();

    let allPlaces = [
      ...attractions,
      ...attractions, // boost atrakcji
      ...food
    ];

    allPlaces.sort(() => Math.random() - 0.5);

    let places = buildSmartFlow(allPlaces);

    if (!places.length) {
      places = [
        { miejsce: "Rynek Wrocław", lat: 51.109, lon: 17.032, typ: "attraction" },
        { miejsce: "Ostrów Tumski", lat: 51.114, lon: 17.046, typ: "attraction" }
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
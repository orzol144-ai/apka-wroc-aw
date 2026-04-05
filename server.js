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

// 🔥 REALNE MIEJSCA + TYP
async function getPlaces(type) {
  const query = `
  [out:json];
  area["name"="Wrocław"]->.searchArea;
  (
    node["amenity"~"${type}|restaurant|cafe|bar|fast_food"](area.searchArea);
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
      .map(p => {
        let typ = "attraction";

        if (["restaurant", "fast_food"].includes(p.tags.amenity)) typ = "food";
        if (["cafe", "bar"].includes(p.tags.amenity)) typ = "coffee";

        return {
          miejsce: p.tags.name,
          opis: "",
          lat: p.lat,
          lon: p.lon,
          typ,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1)
        };
      });

  } catch {
    return [];
  }
}

// 🔥 UKŁADANIE LOGICZNEGO DNIA
function buildSmartFlow(places) {
  const food = places.filter(p => p.typ === "food");
  const coffee = places.filter(p => p.typ === "coffee");
  const attr = places.filter(p => p.typ === "attraction");

  const result = [];

  // start: atrakcje
  result.push(...attr.slice(0, 2));

  // potem kawa
  if (coffee[0]) result.push(coffee[0]);

  // potem atrakcja
  if (attr[2]) result.push(attr[2]);

  // potem jedzenie
  if (food[0]) result.push(food[0]);

  // potem mix
  result.push(...attr.slice(3, 5));
  if (coffee[1]) result.push(coffee[1]);
  if (food[1]) result.push(food[1]);

  return result.slice(0, 10);
}

// 🧠 AI OPISY
async function enrichPlacesWithAIStyled(places, styl) {
  try {
    const prompt = `
Opisz miejsca w stylu: ${styl}

Zasady:
- 1-2 zdania
- ciekawostka / klimat / unikalność

DODAJ:
- realistyczną liczbę opinii

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
        rating: p.rating || (Math.random()*1.5+3.5).toFixed(1),
        opis: found?.opis || "Ciekawe miejsce warte odwiedzenia.",
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

    let types = ["cafe", "restaurant", "fast_food"];

    let allPlaces = [];

    for (let t of types) {
      const places = await getPlaces(t);
      allPlaces = allPlaces.concat(places);
    }

    // shuffle
    allPlaces.sort(() => Math.random() - 0.5);

    // 🔥 SMART FLOW
    let places = buildSmartFlow(allPlaces);

    if (!places.length) {
      places = [
        { miejsce: "Rynek Wrocław", lat: 51.109, lon: 17.032 },
        { miejsce: "Ostrów Tumski", lat: 51.114, lon: 17.046 }
      ];
    }

    // AI opis
    places = await enrichPlacesWithAIStyled(places, styl);

    res.json({ list: places, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
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

// 🔥 REALNE MIEJSCA (Overpass)
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
        opis: "Popularne miejsce we Wrocławiu",
        lat: p.lat,
        lon: p.lon,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      }));

  } catch (e) {
    console.log("Overpass error:", e);
    return [];
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

    // fallback jak API padnie
    if (!places.length) {
      places = [
        { miejsce: "Rynek Wrocław", opis: "Centrum miasta", rating: "4.7" },
        { miejsce: "Ostrów Tumski", opis: "Spacer i klimat", rating: "4.8" }
      ];
    }

    res.json({ list: places, weather });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
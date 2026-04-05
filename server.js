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

// 🔥 GPT helper
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
  return data.output[0].content[0].text;
}

// 📍 PLAN DNIA
app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

const prompt = `
Stwórz REALNY plan całego dnia we Wrocławiu.

WARUNKI:
- styl: ${styl}
- transport: ${transport}
- dzień od 10:00 do ok. 20:00

ZASADY:
- plan musi mieć MINIMUM 8 punktów
- zachowaj LOGIKĘ dnia:
  kawa → atrakcje → jedzenie → atrakcje → chill → kolacja

- NIE powtarzaj typów miejsc pod rząd (np. 2x kawiarnia)
- miejsca muszą być BLISKO siebie (max 15–20 min)
- NIE skacz po całym mieście

SPORT:
- jeśli styl = aktywny → dodaj coś typu:
  - ścianka wspinaczkowa
  - park trampolin
  - basen / sauna
  - indoor aktywność (bo zimno)

TRANSPORT:
- jeśli blisko → pieszo + czas
- jeśli dalej → tramwaj/autobus (nr + gdzie wysiąść)
- jeśli auto → info o parkingu

FORMAT (SZTYWNY):
10:00 – NAZWA MIEJSCA
Opis (min 2-3 zdania + ciekawostka)
Dojście: ...

11:30 – NAZWA MIEJSCA
Opis...
Dojście...

(ciąg dalszy aż do wieczora)

Styl:
- luźny jak polecenie od ziomka
`;

  try {
    const wynik = await askAI(prompt);
    res.json({ wynik });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd" });
  }
});

// 🍔 GŁODNY (nadpisuje plan)
app.post("/food", async (req, res) => {
  const prompt = `
Podaj 3 dobre miejsca na jedzenie we Wrocławiu.

FORMAT:
NAZWA – opis + klimat + ciekawostka
`;

  const wynik = await askAI(prompt);
  res.json({ wynik });
});

// 😴 ODPOCZYNEK (krótki plan)
app.post("/short", async (req, res) => {
  const prompt = `
Stwórz krótki plan dnia (max 3 punkty).

FORMAT:
10:00 – NAZWA
Opis...
`;

  const wynik = await askAI(prompt);
  res.json({ wynik });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
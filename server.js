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
Stwórz REALNY plan dnia we Wrocławiu.

WARUNKI:
- styl: ${styl}
- transport: ${transport}
- pogoda: chłodno (~10°C)

ZASADY:
- miejsca muszą być BLISKO siebie (logiczna trasa)
- NIE skacz po mieście
- maks 10-20 min między punktami
- jeśli dalej → podaj tramwaj/autobus (nr + gdzie wysiąść)
- jeśli blisko → podaj czas pieszo

FORMAT (BARDZO WAŻNE):
Każdy punkt dokładnie tak:

10:00 – NAZWA MIEJSCA
Opis (min 2 zdania + ciekawostka)
Dojście: pieszo X min / tramwaj nr X (wysiądź: ...)

11:30 – NAZWA MIEJSCA
Opis...
Dojście...

12:30 – NAZWA MIEJSCA
Opis...
Dojście...

ZASADY FORMATU:
- MUSI być "– NAZWA"
- MUSI być "Dojście:"
- NIE używaj "undefined"
- NIE powtarzaj godzin
- każdy punkt inny typ (kawa → spacer → jedzenie → atrakcja)

Styl: luźny jak kolega.

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
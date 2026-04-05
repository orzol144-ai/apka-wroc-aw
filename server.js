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

app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

Styl: ${styl}
Transport: ${transport}

ZWRÓĆ JSON:

{
  "kawa": [{ "time": "10:00", "name": "", "opis": "", "dojazd": "" }],
  "jedzenie": [{ "time": "13:00", "name": "", "opis": "", "dojazd": "" }],
  "spacer": [{ "time": "11:30", "name": "", "opis": "", "dojazd": "" }],
  "atrakcja": [{ "time": "15:00", "name": "", "opis": "", "dojazd": "" }]
}

WAŻNE:
- GODZINY OBOWIĄZKOWO (10:00, 11:30 itd.)
- plan ma mieć logiczny ciąg dnia
- miejsca blisko siebie (max 10-15 min)
- konkretne miejsca Wrocław

OPIS:
- 2–3 zdania
- zawiera ciekawostkę
- konkretny klimat

DOJAZD:
- konkretnie: pieszo / tramwaj + ile minut

Każda kategoria min 3 opcje
`;

  try {
    let text = await askAI(prompt);

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    // 🔥 fallback godzin (gdyby AI się wywaliło)
    const godziny = ["10:00","11:30","13:00","15:00"];

    Object.keys(parsed).forEach((kategoria, i) => {
      parsed[kategoria].forEach(item => {
        if(!item.time || item.time.length < 4){
          item.time = godziny[i];
        }
      });
    });

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd AI" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
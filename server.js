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

ZWRÓĆ TYLKO JSON:

{
  "kawa": [{ "name": "", "opis": "", "dojazd": "" }],
  "jedzenie": [{ "name": "", "opis": "", "dojazd": "" }],
  "spacer": [{ "name": "", "opis": "", "dojazd": "" }],
  "atrakcja": [{ "name": "", "opis": "", "dojazd": "" }]
}

WAŻNE:
- plan ma być logiczny geograficznie (blisko siebie)
- max 10-15 min między punktami
- układaj trasę jak spacer „po drodze”
- NIE skacz po całym mieście
- używaj konkretnych miejsc we Wrocławiu
- podawaj okolice (np. Rynek, Nadodrze)
- jeśli dalej → podaj tramwaj/autobus i czas

Styl:
- krótko, konkretnie, bez lania wody

Każda kategoria min 3 propozycje
`;

  try {
    let text = await askAI(prompt);

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

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
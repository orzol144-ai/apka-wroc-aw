import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// pokazuje pliki (np. index.html)
app.use(express.static("."));

// główna strona
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});
// 🔐 klucz z ENV (Render / lokalnie)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/plan", async (req, res) => {
  const styl = req.body.styl;

  const prompt = `
Stwórz szczegółowy plan dnia we Wrocławiu dla stylu: ${styl}.

Uwzględnij:
- Aktualna pogoda: chłodno (ok. 10°C), możliwe zachmurzenie
- Unikaj aktywności typu rower jeśli zimno
- Preferuj miejsca pod dachem + klimatyczne spacery

Każdy punkt musi zawierać:
- godzinę
- konkretne miejsce (nazwa!)
- krótki opis klimatu
- ciekawostkę o miejscu (jeśli możliwe)
- jak się tam dostać (np. spacer, tramwaj)

Styl:
- luźny, naturalny, jak polecenie od znajomego

Format (BARDZO WAŻNE):
10:00
Kawiarnia X – opis... Dojście...

11:30
Miejsce Y – opis...

Bez znaków typu *, #, list itd.

Na końcu dodaj krótkie podsumowanie dnia.
`;

  try {
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

    res.json({
      wynik: data.output[0].content[0].text
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// 🚀 PORT pod Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
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
  try {
    const { styl } = req.body;

    const prompt = `
Ułóż plan dnia we Wrocławiu dla stylu: ${styl}.
Podaj konkretny plan godzinowy + propozycje miejsc.
Krótko, konkretnie, po polsku.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Jesteś pomocnym asystentem." },
        { role: "user", content: prompt }
      ]
    });

    const wynik = response.choices[0].message.content;

    res.json({ wynik });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Błąd API" });
  }
});

// 🚀 PORT pod Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
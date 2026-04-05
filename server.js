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

// 🔥 AI request
async function askAI(prompt) {
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

  return data.output?.[0]?.content?.[0]?.text || "";
}

// 🔥 PARSER (najważniejsze)
function parsePlan(text) {
  const blocks = text.split("\n\n");

  return blocks.map(block => {
    const lines = block.split("\n");

    const titleLine = lines[0] || "";
    const miejsce = titleLine.split("–")[1]?.trim() || "Miejsce";

    const opis = lines.slice(1).join(" ").trim();

    return { miejsce, opis };
  }).filter(x => x.miejsce && x.opis);
}

app.post("/plan", async (req, res) => {
  const { styl } = req.body;

  const prompt = `
Stwórz plan dnia we Wrocławiu.

STYL: ${styl}

ZASADY:
- 6 punktów
- logiczna trasa (blisko siebie!)
- każdy kolejny punkt ma odniesienie do poprzedniego

DOPASOWANIE:
- leniwy → max 10 minut pieszo między punktami
- romantyczny → klimat + kolacja + spacery
- aktywny → mix ruch + jedzenie + atrakcje

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...

WAŻNE:
- brak gwiazdek **
- każde miejsce REALNE
`;

  try {
    let wynik = await askAI(prompt);

    console.log("WYNIK GPT:", wynik);

    // 🔥 fallback jeśli AI zwróci śmieci
    if (!wynik || wynik.length < 50) {
      wynik = `
10:00 – Rynek Wrocław
Serce miasta z kolorowymi kamienicami.
Dojście: start

11:30 – Ostrów Tumski
Najstarsza część miasta.
Dojście: 10 min pieszo

13:00 – Hala Targowa
Street food i lokalne klimaty.
Dojście: 5 min pieszo

14:30 – Panorama Racławicka
Ogromne malowidło historyczne.
Dojście: 10 min pieszo

16:00 – Bulwary nad Odrą
Spacer i chill przy wodzie.
Dojście: 8 min pieszo

18:00 – Restauracja Bernard
Kolacja przy Rynku.
Dojście: 12 min pieszo
`;
    }

    const list = parsePlan(wynik);

    console.log("PARSED:", list);

    res.json({ list });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa na porcie", PORT));
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

// 🔥 parser
function parsePlan(text) {
  const blocks = text.split("\n\n");

  return blocks.map(block => {
    const lines = block.split("\n");

    const title = lines[0] || "";
    const miejsce = title.split("–")[1]?.trim() || "Miejsce";

    const opis = lines.slice(1).join(" ").trim();

    return { miejsce, opis };
  }).filter(x => x.miejsce && x.opis);
}

app.post("/plan", async (req, res) => {
  try {
    const { styl } = req.body;

    const prompt = `
Stwórz plan dnia we Wrocławiu.

STYL: ${styl}

ZASADY:
- 6 punktów
- logiczna trasa (blisko siebie!)

FORMAT:
10:00 – NAZWA
Opis
Dojście: ...

WAŻNE:
- brak gwiazdek **
- każde miejsce REALNE
`;

    let wynik = await askAI(prompt);

    // fallback
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

    res.json({ list });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
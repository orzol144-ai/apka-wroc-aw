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
  return data.output[0].content[0].text;
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
- aktywny → mix ruch + jedzenie + atrakcje (NIE same sporty!)

KAŻDY PUNKT MUSI MIEĆ:

10:00 – NAZWA MIEJSCA
Opis (ciekawostka + klimat)
Dojście: X min pieszo LUB tramwaj X (skąd → dokąd)

WAŻNE:
- NIE używaj gwiazdek **
- NIE używaj słowa undefined
- ZAWSZE dodaj "Dojście:"
- każde miejsce REALNE (np Rynek, Ostrów Tumski, Hala Targowa itd.)
`;

  try {
    let wynik = await askAI(prompt);

    // 🔥 Fallback jak GPT coś odwali
    if (!wynik || wynik.length < 100) {
      wynik = `
10:00 – Rynek Wrocław
Serce miasta z kolorowymi kamienicami i Ratuszem. Jedno z największych rynków w Europie.
Dojście: start w centrum

11:30 – Ostrów Tumski
Najstarsza część miasta, znana z klimatycznych latarni gazowych zapalanych ręcznie.
Dojście: 10 min pieszo z Rynku

13:00 – Hala Targowa
Miejsce pełne lokalnego jedzenia i klimatu starego Wrocławia.
Dojście: 5 min pieszo

14:30 – Panorama Racławicka
Ogromne malowidło historyczne robiące mega wrażenie.
Dojście: 10 min pieszo

16:00 – Bulwary nad Odrą
Idealne miejsce na chill i spacer przy wodzie.
Dojście: 8 min pieszo

18:00 – Kolacja – Bernard
Tradycyjna kuchnia w klimatycznym wnętrzu przy Rynku.
Dojście: 12 min pieszo
`;
    }

    res.json({ wynik });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa"));
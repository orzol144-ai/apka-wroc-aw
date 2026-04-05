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
  return data.output?.[0]?.content?.[0]?.text || "";
}

app.post("/plan", async (req, res) => {
  const { styl, transport } = req.body;

  const prompt = `
Plan dnia Wrocław.

Styl: ${styl}
Transport: ${transport}

JSON:

{
 "kawa": [],
 "jedzenie": [],
 "spacer": [],
 "atrakcja": []
}

WARUNKI:
- MINIMUM 5 opcji w każdej kategorii
- miejsca BLISKO siebie
- logiczna trasa
- godziny obowiązkowe

OPIS:
- 2-3 zdania
- ciekawostka
- konkrety

DOJAZD:
- pieszo / tramwaj / auto + czas

ZWROT tylko JSON
`;

  try {
    let text = await askAI(prompt);

    text = text.replace(/```json/g,"").replace(/```/g,"").trim();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        kawa: [],
        jedzenie: [],
        spacer: [],
        atrakcja: []
      };
    }

    // 🔥 fallback jeśli AI coś spartoli
    const godziny = ["10:00","11:30","13:00","15:00","17:00"];

    Object.keys(parsed).forEach((k,i)=>{
      if(!parsed[k] || parsed[k].length < 3){
        parsed[k] = [{
          time: godziny[i],
          name: "Rynek Wrocław",
          opis: "Centralne miejsce miasta pełne życia i historii. To tutaj krzyżują się wszystkie klimaty Wrocławia.",
          dojazd: "centrum, wszędzie blisko"
        }];
      }

      parsed[k].forEach((item,idx)=>{
        if(!item.time) item.time = godziny[idx] || "12:00";
      });
    });

    res.json(parsed);

  } catch (err) {
    res.json({
      kawa: [],
      jedzenie: [],
      spacer: [],
      atrakcja: []
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
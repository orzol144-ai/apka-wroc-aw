function buildSmartFlow(allPlaces) {
  const food = allPlaces.filter(p => p.typ === "food");
  const coffee = allPlaces.filter(p => p.typ === "coffee");
  const attr = allPlaces.filter(p => p.typ === "attraction");

  const result = [];

  // 🔥 RANO (10:00)
  if (coffee[0]) result.push(coffee[0]);
  else if (attr[0]) result.push(attr[0]);

  // 🔥 12:00
  if (attr[1]) result.push(attr[1]);

  // 🔥 14:00 (obiad)
  if (food[0]) result.push(food[0]);
  else if (coffee[1]) result.push(coffee[1]);

  // 🔥 16:00
  if (attr[2]) result.push(attr[2]);

  // 🔥 18:00 (kolacja)
  if (food[1]) result.push(food[1]);

  // 🔥 20:00 (dopiero tu bary / klimat)
  if (coffee[2]) result.push(coffee[2]);

  // 🔥 22:00 (opcjonalnie coś klimatycznego)
  if (attr[3]) result.push(attr[3]);

  // 🔥 fallback żeby zawsze było pełne
  let i = 0;
  while (result.length < 7 && i < allPlaces.length) {
    const p = allPlaces[i];
    if (!result.find(x => x.miejsce === p.miejsce)) {
      result.push(p);
    }
    i++;
  }

  return result;
}
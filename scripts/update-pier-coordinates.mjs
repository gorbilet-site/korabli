import fs from 'node:fs';

const UPDATED_AT = '2026-06-19';

// Координаты ставим на физическую точку посадки/причал.
// Приоритет: именованный объект причала в OSM/картах, затем coordinates_list Gorbilet,
// затем координаты из исходного списка, если отдельного именованного объекта нет.
const COORDS_BY_NAME = new Map([
  ['Причал на наб. Фонтанки, 121 («Нева-Кронверк»)', [59.920439, 30.311257]],
  ['Причал на Английской набережной, 28', [59.93417, 30.293188]],
  ['Причал №2 на набережной Макарова, 28', [59.948887, 30.280813]],
  ['Причал на Университетской набережной, 13', [59.939022, 30.298653]],
  ['Причал на Английской набережной, 54', [59.932311, 30.287508]],
  ['Причал «У Синего моста»', [59.930953, 30.307693]],
  ['Причал на набережной Мойки, 26 («Нептун»)', [59.939151, 30.319499]],
  ['Причал «Набережная Фонтанки, 34»', [59.936453, 30.345459]],
  ['Причал на Петровской набережной', [59.952795, 30.332536]],
  ['Причал «Кунсткамера»', [59.94141, 30.305299]],
  ['Причал «Невские ворота» у Петропавловской крепости', [59.948922, 30.318976]],
  ['Причал у Адмиралтейства «Спуск со львами»', [59.93992, 30.308844]],
  ['Причал у Кронверкского моста («Северная Венеция»)', [59.950019, 30.30909]],
  ['Причал на набережной Фонтанки, 71', [59.926392, 30.329479]],
  ['Причал на Малоохтинской набережной, 61', [59.928895, 30.398367]],
  ['Причал на Синопской набережной, 28', [59.929901, 30.389851]],
  ['Причал «Адмиралтейская наб., 8»', [59.938911, 30.306371]],
  ['Причал №4 на Дворцовой набережной, 18', [59.944423, 30.322042]],
  ['Причал на наб. канала Грибоедова, 54', [59.926729, 30.315384]],
  ['Яхт-клуб у Лопухинского сада', [59.977899, 30.308322]],
  ['Причал на наб. канала Грибоедова, 73', [59.926231, 30.310645]],
  ['Санкт-Петербургский речной яхт-клуб', [59.964635, 30.240408]],
  ['Причал на проспекте Римского-Корсакова, 24', [59.921836, 30.292]],
  ['Причал «Летний сад»', [59.947489, 30.333715]],
  ['Причал на набережной Фонтанки, 150', [59.915874, 30.286334]],
  ['Причал на Ждановской набережной, 2А', [59.954948, 30.283035]],
  ['Причал на Дворцовой набережной, 38 (Эрмитаж Нижний)', [59.942451, 30.314238]],
  ['Причал «Дворцовая пристань»', [59.942085, 30.314044]],
  ['Причал «Сенатская пристань»', [59.936707, 30.300335]],
  ['Речной вокзал', [59.870049, 30.461023]],
]);

const COMBINED_PALACE_NAME = 'Причал «Дворцовая пристань» / «Сенатская пристань»';
const COMBINED_SUMMER_NAME = 'Причал «Конюшенное ведомство» / «Летний сад»';
const SUMMER_NAME = 'Причал «Летний сад»';

function clone(item) {
  return structuredClone(item);
}

function applyCoords(item, compact) {
  const nameKey = compact ? 'n' : 'name';
  const coordsKey = compact ? 'll' : 'coords';
  const coords = COORDS_BY_NAME.get(item[nameKey]);
  if (coords) item[coordsKey] = coords;
  return item;
}

function normalizeList(items, compact = false) {
  const nameKey = compact ? 'n' : 'name';
  const coordsKey = compact ? 'll' : 'coords';
  const output = [];

  for (const source of items) {
    const item = clone(source);
    const name = item[nameKey];

    if (name === COMBINED_PALACE_NAME) {
      item[nameKey] = 'Причал «Дворцовая пристань»';
      item[coordsKey] = COORDS_BY_NAME.get(item[nameKey]);
      if (!compact) item.id = 'prichal-dvortsovaya-pristan';
      output.push(item);

      const senate = clone(item);
      senate[nameKey] = 'Причал «Сенатская пристань»';
      senate[coordsKey] = COORDS_BY_NAME.get(senate[nameKey]);
      if (!compact) senate.id = 'prichal-senatskaya-pristan';
      output.push(senate);
      continue;
    }

    if (name === COMBINED_SUMMER_NAME) {
      item[nameKey] = SUMMER_NAME;
      if (!compact) item.id = 'prichal-letniy-sad';
    }

    output.push(applyCoords(item, compact));
  }

  return output;
}

const dataPath = 'data/piers.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.piers = normalizeList(data.piers);
data.meta.updated = UPDATED_AT;
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const indexPath = 'index.html';
let html = fs.readFileSync(indexPath, 'utf8');
const match = html.match(/const PIERS=(\[.*?\]);\r?\nconst LANDMARKS/s);
if (!match) throw new Error('Embedded PIERS data was not found in index.html');

const compactPiers = normalizeList(JSON.parse(match[1]), true);
html = html.replace(match[0], `const PIERS=${JSON.stringify(compactPiers)};\nconst LANDMARKS`);
html = html.replace('29 точек отправления', '30 точек отправления');
fs.writeFileSync(indexPath, html, 'utf8');

console.log(`Updated ${compactPiers.length} physical pier markers.`);

import type { CategoryResults, Event, EventResults, ResultsTable } from '../types';

export interface ChampionshipEventRef {
  id: string;
  name: string;
  shortLabel: string; // e.g. "V1", "V2"
  date: string;
  city: string;
}

export interface ChampionshipRiderStanding {
  position: number;
  number: string;
  allNumbers: string[]; // Lista de todos los números usados en el campeonato
  name: string;
  bike: string;
  pointsByEvent: Record<string, number>;
  numbersByEvent: Record<string, string>;
  totalPoints: number;
  diffToFirst: number;
}

export interface ChampionshipCategoryStandings {
  categoryId: string;
  categoryLabel: string;
  events: ChampionshipEventRef[];
  standings: ChampionshipRiderStanding[];
}

export interface PublishedEventResult {
  event: Event;
  results: EventResults;
}

export interface OfficialCategoryEntry {
  number: string;
  name: string;
  bike: string;
  points: number;
}

// ─── DICCIONARIO DE HIPOCORÍSTICOS Y APODOS EN ESPAÑOL ───────────────────────

const SPANISH_NICKNAMES: Record<string, string[]> = {
  maxi: ['maximiliano', 'maximo'],
  maximiliano: ['maxi', 'max'],
  maximo: ['maxi', 'max'],
  santi: ['santiago'],
  santiago: ['santi'],
  nico: ['nicolas'],
  nicolas: ['nico'],
  mati: ['matias', 'mateo'],
  matias: ['mati'],
  mateo: ['mati', 'teo'],
  teo: ['mateo'],
  sebas: ['sebastian'],
  sebastian: ['sebas', 'tian'],
  jero: ['jeronimo'],
  jeronimo: ['jero'],
  sami: ['samuel'],
  samuel: ['sami'],
  dani: ['daniel', 'daniela'],
  daniel: ['dani'],
  gabi: ['gabriel', 'gabriela'],
  gabriel: ['gabi'],
  alejo: ['alejandro'],
  alex: ['alejandro', 'alexander'],
  alejandro: ['alejo', 'alex'],
  fede: ['federico'],
  federico: ['fede'],
  valen: ['valentino', 'valentin', 'valentina'],
  valentino: ['valen', 'tino'],
  valentin: ['valen'],
  juanjo: ['juan', 'jose'],
  juani: ['juan', 'ignacio'],
  juanse: ['juan', 'sebastian'],
  manu: ['manuel', 'manuela'],
  manuel: ['manu'],
  rafa: ['rafael'],
  rafael: ['rafa'],
  nacho: ['ignacio'],
  ignacio: ['nacho'],
  beto: ['alberto', 'roberto'],
  alberto: ['beto'],
  roberto: ['beto'],
  lucho: ['luis'],
  luis: ['lucho'],
  pipe: ['felipe'],
  felipe: ['pipe'],
  cris: ['cristian', 'cristobal'],
  cristian: ['cris'],
  tomi: ['tomas'],
  tomas: ['tomi'],
  leo: ['leonardo', 'leonel'],
  leonardo: ['leo'],
  joaco: ['joaquin'],
  joaquin: ['joaco'],
  facu: ['facundo'],
  facundo: ['facu'],
  benja: ['benjamin'],
  benjamin: ['benja'],
  emi: ['emilio', 'emiliano'],
  emilio: ['emi'],
  emiliano: ['emi'],
  lucas: ['luca'],
  luca: ['lucas'],
};

// ─── UTILIDADES DE NORMALIZACIÓN Y DISTANCIA ─────────────────────────────────

/**
 * Normaliza cadenas de texto: minúsculas, sin tildes, sin puntuación innecesaria.
 */
export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Divide un nombre en tokens de palabras significativas (mínimo 2 caracteres).
 */
export function tokenizeName(name: string): string[] {
  const normalized = normalizeKey(name);
  if (!normalized) return [];
  const stopWords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'jr', 'junior', 'hijo', 'ii', 'iii']);
  return normalized
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Comprueba si dos palabras son idénticas o tienen una variación tipográfica menor.
 */
function areTokensFuzzyEqual(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;
  const maxLen = Math.max(tokenA.length, tokenB.length);
  if (maxLen <= 4) return false;

  const dist = levenshteinDistance(tokenA, tokenB);
  return maxLen <= 7 ? dist <= 1 : dist <= 2;
}

/**
 * Comprueba si dos primeros nombres son compatibles (idénticos, error de dedo,
 * hipocorístico como Maxi <-> Maximiliano, o prefijo directo).
 */
export function areFirstNamesCompatible(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;

  // 1. Error de dedo leve
  if (areTokensFuzzyEqual(tokenA, tokenB)) return true;

  // 2. Diccionario de hipocorísticos
  if (SPANISH_NICKNAMES[tokenA]?.includes(tokenB) || SPANISH_NICKNAMES[tokenB]?.includes(tokenA)) {
    return true;
  }

  // 3. Prefijo directo (ej. "maxi" es prefijo de "maximiliano", "santi" de "santiago")
  const [shorter, longer] = tokenA.length <= tokenB.length ? [tokenA, tokenB] : [tokenB, tokenA];
  if (shorter.length >= 3 && longer.startsWith(shorter)) {
    return true;
  }

  return false;
}

/**
 * Algoritmo inteligente de coincidencia entre dos pilotos en la misma categoría.
 */
export function areRidersSamePerson(
  candidate: { name: string; number: string },
  existing: { name: string; number: string; allNumbers: string[] }
): boolean {
  const normA = normalizeKey(candidate.name);
  const normB = normalizeKey(existing.name);

  // 1. Coincidencia exacta de nombre normalizado
  if (normA && normB && normA === normB) {
    return true;
  }

  const tokensA = tokenizeName(candidate.name);
  const tokensB = tokenizeName(existing.name);

  const cleanNumA = candidate.number.replace(/^#+/, '').trim();
  const numMatches = cleanNumA && existing.allNumbers.some((num) => num.replace(/^#+/, '').trim() === cleanNumA);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return Boolean(numMatches);
  }

  const firstA = tokensA[0];
  const firstB = tokensB[0];
  const firstNamesCompatible = areFirstNamesCompatible(firstA, firstB);

  // 2. Guardián: Si los primeros nombres son contradictorios (ej. Martin vs Matias),
  // NUNCA son la misma persona.
  if (!firstNamesCompatible) {
    return false;
  }

  // 3. Coincidencia reforzada cuando el número de piloto coincide exactamente (ej. #888)
  if (numMatches) {
    const restA = tokensA.slice(1);
    const restB = tokensB.slice(1);
    // Si ambos tienen al menos un apellido, comprobar que coincida (ej. Yepes == Yepes)
    if (restA.length > 0 && restB.length > 0) {
      const shareLastName = restA.some((tA) =>
        restB.some((tB) => areTokensFuzzyEqual(tA, tB) || tA === tB)
      );
      if (shareLastName) return true;
    } else {
      // Si uno solo anotó su nombre/apodo y el número coincide
      return true;
    }
  }

  // 4. Coincidencia por subconjunto de tokens (ej. "Matias Gomez" vs "Matias Gomez Orjuela")
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  let matches = 0;
  for (const shortToken of shorter) {
    const found = longer.some(
      (longToken) => areTokensFuzzyEqual(shortToken, longToken) || areFirstNamesCompatible(shortToken, longToken)
    );
    if (found) matches++;
  }

  if (matches === shorter.length && matches >= 2) {
    return true;
  }

  if (matches >= 1 && matches === shorter.length && numMatches) {
    return true;
  }

  // 5. Distancia de Levenshtein global en el nombre completo
  const fullDist = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen >= 8 && fullDist <= 2) {
    return true;
  }

  if (numMatches && maxLen >= 8 && fullDist <= 4) {
    return true;
  }

  return false;
}

// ─── EXTRACCIÓN DE VALORES DESDE FILAS CSV ──────────────────────────────────

function findValueByKeys(row: Record<string, string>, possibleKeys: string[]): string {
  const rowEntries = Object.entries(row);

  for (const target of possibleKeys) {
    const normTarget = normalizeKey(target);
    for (const [key, value] of rowEntries) {
      if (normalizeKey(key) === normTarget && value.trim()) {
        return value.trim();
      }
    }
  }

  for (const target of possibleKeys) {
    const normTarget = normalizeKey(target);
    for (const [key, value] of rowEntries) {
      if (normalizeKey(key).includes(normTarget) && value.trim()) {
        return value.trim();
      }
    }
  }

  return '';
}

export function extractFinalPoints(row: Record<string, string>): number {
  const raw = findValueByKeys(row, ['total puntos', 'puntos totales', 'total pts', 'total', 'puntos', 'pts']);
  if (!raw) return 0;
  const cleaned = raw.replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractRiderNumber(row: Record<string, string>): string {
  const raw = findValueByKeys(row, ['n°', 'no.', 'numero', 'num', '#', 'n.', 'nro']);
  return raw || '';
}

export function extractRiderName(row: Record<string, string>): string {
  const raw = findValueByKeys(row, ['nombre', 'piloto', 'nombre del piloto', 'competidor', 'rider']);
  return raw || '';
}

export function extractRiderBike(row: Record<string, string>): string {
  const raw = findValueByKeys(row, ['moto', 'marca', 'marca moto', 'vehiculo', 'bike']);
  return raw || '';
}

/**
 * Obtiene los registros oficiales de una categoría para una válida:
 * 1. Si existe la manga "final", se toma la final.
 * 2. Si NO existe "final" y la categoría corrió manga única, se toma esa manga.
 * 3. Si se corrieron varias mangas sin archivo final, se consolidan las mangas de esa válida.
 */
export function getOfficialCategoryEntries(cat: CategoryResults): OfficialCategoryEntry[] {
  if (cat.final && cat.final.rows && cat.final.rows.length > 0) {
    return cat.final.rows.map((row) => ({
      number: extractRiderNumber(row),
      name: extractRiderName(row),
      bike: extractRiderBike(row),
      points: extractFinalPoints(row),
    }));
  }

  const availableMangas: ResultsTable[] = [];
  if (cat.manga1?.rows?.length) availableMangas.push(cat.manga1);
  if (cat.manga2?.rows?.length) availableMangas.push(cat.manga2);
  if (cat.manga3?.rows?.length) availableMangas.push(cat.manga3);

  if (availableMangas.length === 0) {
    return [];
  }

  if (availableMangas.length === 1) {
    return availableMangas[0].rows.map((row) => ({
      number: extractRiderNumber(row),
      name: extractRiderName(row),
      bike: extractRiderBike(row),
      points: extractFinalPoints(row),
    }));
  }

  const riderMap = new Map<string, OfficialCategoryEntry>();
  availableMangas.forEach((manga) => {
    manga.rows.forEach((row) => {
      const number = extractRiderNumber(row);
      const name = extractRiderName(row);
      const bike = extractRiderBike(row);
      const points = extractFinalPoints(row);
      if (!name && !number) return;

      const key = normalizeKey(name) || number.replace(/^#+/, '').trim();
      if (!riderMap.has(key)) {
        riderMap.set(key, { number, name, bike, points: 0 });
      }
      const entry = riderMap.get(key)!;
      entry.points += points;
      if (bike && entry.bike === '-') entry.bike = bike;
      if (number && !entry.number) entry.number = number;
    });
  });

  return Array.from(riderMap.values());
}

interface CategoryAccumulator {
  categoryId: string;
  categoryLabel: string;
  eventsInCat: Map<string, ChampionshipEventRef>;
  riders: {
    canonicalName: string;
    latestNumber: string;
    allNumbers: Set<string>;
    latestBike: string;
    pointsByEvent: Record<string, number>;
    numbersByEvent: Record<string, string>;
  }[];
}

/**
 * Calcula la sumatoria acumulada de puntos del campeonato por categoría,
 * unificando inteligentemente hipocorísticos/apodos y aplicando la regla oficial de desempate
 * por mejor resultado en la válida más reciente.
 */
export function computeChampionshipStandings(
  publishedList: PublishedEventResult[]
): ChampionshipCategoryStandings[] {
  const sortedEvents = [...publishedList].sort((a, b) => a.event.date.localeCompare(b.event.date));

  const categoryMap = new Map<string, CategoryAccumulator>();

  sortedEvents.forEach(({ event, results }, eventIndex) => {
    const eventRef: ChampionshipEventRef = {
      id: event.id,
      name: event.name,
      shortLabel: `V${eventIndex + 1}`,
      date: event.date,
      city: event.city,
    };

    results.categories.forEach((cat) => {
      const officialEntries = getOfficialCategoryEntries(cat);
      if (!officialEntries || officialEntries.length === 0) {
        return;
      }

      if (!categoryMap.has(cat.categoryId)) {
        categoryMap.set(cat.categoryId, {
          categoryId: cat.categoryId,
          categoryLabel: cat.categoryLabel || cat.categoryId,
          eventsInCat: new Map(),
          riders: [],
        });
      }

      const catEntry = categoryMap.get(cat.categoryId)!;
      catEntry.eventsInCat.set(event.id, eventRef);

      officialEntries.forEach((entry) => {
        const { number, name, bike, points } = entry;

        if (!name && !number) return;

        const formattedNumber = number
          ? (number.startsWith('#') ? number : `#${number}`)
          : '';

        // REGLA DE ORO FÍSICA: Dos registros en el MISMO evento son personas distintas.
        let matchedRider = catEntry.riders.find((existing) => {
          if (existing.pointsByEvent[event.id] !== undefined) {
            return false;
          }
          return areRidersSamePerson(
            { name, number: formattedNumber },
            {
              name: existing.canonicalName,
              number: existing.latestNumber,
              allNumbers: Array.from(existing.allNumbers),
            }
          );
        });

        if (!matchedRider) {
          const newRider = {
            canonicalName: name || 'Piloto sin nombre',
            latestNumber: formattedNumber,
            allNumbers: new Set<string>(formattedNumber ? [formattedNumber] : []),
            latestBike: bike || '-',
            pointsByEvent: {},
            numbersByEvent: {},
          };
          catEntry.riders.push(newRider);
          matchedRider = newRider;
        }

        matchedRider.pointsByEvent[event.id] = points;
        if (formattedNumber) {
          matchedRider.latestNumber = formattedNumber;
          matchedRider.allNumbers.add(formattedNumber);
          matchedRider.numbersByEvent[event.id] = formattedNumber;
        }
        if (bike && bike !== '-') {
          matchedRider.latestBike = bike;
        }

        // Si el nuevo nombre es más completo y formal (ej. "Maximiliano Yepes" > "Maxi Yepes"),
        // adoptarlo como nombre canónico oficial
        if (name) {
          const currentTokens = tokenizeName(matchedRider.canonicalName);
          const newTokens = tokenizeName(name);
          if (
            newTokens.length > currentTokens.length ||
            (newTokens.length === currentTokens.length && name.length > matchedRider.canonicalName.length)
          ) {
            matchedRider.canonicalName = name;
          }
        }
      });
    });
  });

  const categoriesResult: ChampionshipCategoryStandings[] = [];

  categoryMap.forEach((catEntry) => {
    const eventsList = Array.from(catEntry.eventsInCat.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (eventsList.length === 0) return;

    const ridersArray: ChampionshipRiderStanding[] = catEntry.riders.map((rider) => {
      let total = 0;
      eventsList.forEach((ev) => {
        total += rider.pointsByEvent[ev.id] ?? 0;
      });

      return {
        position: 0,
        number: rider.latestNumber,
        allNumbers: Array.from(rider.allNumbers),
        name: rider.canonicalName,
        bike: rider.latestBike,
        pointsByEvent: rider.pointsByEvent,
        numbersByEvent: rider.numbersByEvent,
        totalPoints: total,
        diffToFirst: 0,
      };
    });

    // ─── CRITERIO OFICIAL DE CLASIFICACIÓN Y DESEMPATE REGRESIVO ───────────
    // 1. Mayor puntaje total acumulado.
    // 2. Si empatan en puntos totales: desempata el que tenga más puntos en la válida más reciente (la última disputada).
    // 3. Si siguen empatados: se evalúa hacia atrás de forma regresiva (penúltima, antepenúltima...).
    // 4. Nombre alfabético.
    ridersArray.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      // Desempate regresivo: desde la válida más reciente (eventsList.length - 1) hacia la más antigua (0)
      for (let i = eventsList.length - 1; i >= 0; i--) {
        const evId = eventsList[i].id;
        const ptsA = a.pointsByEvent[evId] ?? 0;
        const ptsB = b.pointsByEvent[evId] ?? 0;
        if (ptsB !== ptsA) {
          return ptsB - ptsA; // El que sumó más en la válida más reciente se queda con la posición
        }
      }

      return a.name.localeCompare(b.name);
    });

    const leaderPoints = ridersArray[0]?.totalPoints ?? 0;

    ridersArray.forEach((rider, index) => {
      rider.position = index + 1;
      rider.diffToFirst = leaderPoints - rider.totalPoints;
    });

    categoriesResult.push({
      categoryId: catEntry.categoryId,
      categoryLabel: catEntry.categoryLabel,
      events: eventsList,
      standings: ridersArray,
    });
  });

  return categoriesResult;
}

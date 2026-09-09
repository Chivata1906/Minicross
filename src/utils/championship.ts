import type { Event, EventResults } from '../types';

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
  // Excluir conectores habituales como de, del, la, jr, junior
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
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // borrado
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
  // Para palabras muy cortas (ej. 2-4 letras), no toleramos errores
  if (maxLen <= 4) return false;

  const dist = levenshteinDistance(tokenA, tokenB);
  // 1 error para palabras de 5-7 letras, 2 errores para palabras mayores
  return maxLen <= 7 ? dist <= 1 : dist <= 2;
}

/**
 * Determina si el primer nombre (o token inicial) es incompatible.
 * Ej: "Martin" vs "Matias" tienen distancia 3 -> incompatible (NO son la misma persona).
 * "Santiago" vs "Santigo" tienen distancia 1 -> compatible (error de dedo).
 */
function areFirstNamesContradictory(tokensA: string[], tokensB: string[]): boolean {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  const firstA = tokensA[0];
  const firstB = tokensB[0];
  if (firstA === firstB) return false;

  // Si son diferentes, comprobar si es un simple error tipográfico
  return !areTokensFuzzyEqual(firstA, firstB);
}

/**
 * Algoritmo inteligente de coincidencia entre dos pilotos en la misma categoría.
 * Evalúa: coincidencia exacta, coincidencia de subconjunto de tokens y similitud difusa.
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

  if (tokensA.length === 0 || tokensB.length === 0) {
    // Si no hay nombre pero sí número idéntico válido
    const cleanNumA = candidate.number.replace(/^#+/, '').trim();
    const cleanNumB = existing.number.replace(/^#+/, '').trim();
    return cleanNumA !== '' && cleanNumA === cleanNumB;
  }

  // 2. Guardián: si los primeros nombres son contradictorios (ej: "Martin" vs "Matias"),
  // NO son la misma persona bajo ninguna circunstancia.
  if (areFirstNamesContradictory(tokensA, tokensB)) {
    return false;
  }

  // 3. Coincidencia por subconjunto de tokens (ej: "Matias Gomez Orjuela" vs "Matias Gomez")
  // El nombre más corto debe coincidir palabra por palabra (o con fuzzy leve) en el más largo.
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  let matches = 0;
  for (const shortToken of shorter) {
    const found = longer.some((longToken) => areTokensFuzzyEqual(shortToken, longToken));
    if (found) matches++;
  }

  // Si todas las palabras del nombre más corto están presentes en el nombre más largo:
  // y hay al menos 2 tokens coincidentes (ej. Nombre + Apellido)
  if (matches === shorter.length && matches >= 2) {
    return true;
  }

  // Si solo hay 1 token pero el número de piloto coincide exactamente
  const cleanNumA = candidate.number.replace(/^#+/, '').trim();
  const numMatches = cleanNumA && existing.allNumbers.some((num) => num.replace(/^#+/, '').trim() === cleanNumA);

  if (matches >= 1 && matches === shorter.length && numMatches) {
    return true;
  }

  // 4. Distancia de Levenshtein global en el nombre normalizado (para dedazos generales)
  const fullDist = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen >= 8 && fullDist <= 2) {
    return true;
  }

  // Si el número coincide y la similitud del nombre es muy alta (distancia <= 3 en nombres largos)
  if (numMatches && maxLen >= 10 && fullDist <= 3) {
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
 * teniendo ÚNICAMENTE en cuenta los puntos totales de la manga "final" de cada válida,
 * unificando inteligentemente a los pilotos con tolerancia a cambios de número y nombres parciales/erratas.
 */
export function computeChampionshipStandings(
  publishedList: PublishedEventResult[]
): ChampionshipCategoryStandings[] {
  // Ordenar eventos cronológicamente
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
      // Tomamos ÚNICAMENTE la manga "final"
      const finalTable = cat.final;
      if (!finalTable || !finalTable.rows || finalTable.rows.length === 0) {
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

      finalTable.rows.forEach((row) => {
        const number = extractRiderNumber(row);
        const name = extractRiderName(row);
        const bike = extractRiderBike(row);
        const points = extractFinalPoints(row);

        if (!name && !number) return;

        // Formato estándar del número
        const formattedNumber = number
          ? (number.startsWith('#') ? number : `#${number}`)
          : '';

        // Buscar si ya existe este piloto en la categoría.
        // REGLA DE ORO FÍSICA: Dos registros en el MISMO evento son personas distintas.
        // Solo podemos emparejar con un piloto existente que NO tenga ya puntaje en este mismo evento.
        let matchedRider = catEntry.riders.find((existing) => {
          if (existing.pointsByEvent[event.id] !== undefined) {
            return false; // Ya compitió en este evento
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
          // Nuevo piloto en la categoría
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

        // Actualizar datos del piloto
        matchedRider.pointsByEvent[event.id] = points;
        if (formattedNumber) {
          matchedRider.latestNumber = formattedNumber;
          matchedRider.allNumbers.add(formattedNumber);
          matchedRider.numbersByEvent[event.id] = formattedNumber;
        }
        if (bike && bike !== '-') {
          matchedRider.latestBike = bike;
        }

        // Si el nuevo nombre es más completo y detallado (más tokens o más largo), actualizar el nombre canónico
        if (name) {
          const currentTokens = tokenizeName(matchedRider.canonicalName);
          const newTokens = tokenizeName(name);
          if (newTokens.length > currentTokens.length || (newTokens.length === currentTokens.length && name.length > matchedRider.canonicalName.length)) {
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

    // Ordenar de mayor a menor puntaje
    // Desempate: puntaje en la última válida disputada, luego nombre
    const lastEventId = eventsList[eventsList.length - 1]?.id;

    ridersArray.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (lastEventId) {
        const lastPtsA = a.pointsByEvent[lastEventId] ?? 0;
        const lastPtsB = b.pointsByEvent[lastEventId] ?? 0;
        if (lastPtsB !== lastPtsA) {
          return lastPtsB - lastPtsA;
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

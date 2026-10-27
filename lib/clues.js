// Learn-mode clue builder.
//
// RULE: every clue must come from one of two places:
//   1. The museum's own catalog record for this object (quoted, not paraphrased into new claims), or
//   2. A short list of general art-history facts below, each tied to a published source.
// Nothing here looks at the image or guesses. If a painting has no usable data, it gets fewer clues.

// ---------------------------------------------------------------------------
// Vetted reference facts. Each one is deliberately conservative and only fires
// for the cultures it was written about.
// ---------------------------------------------------------------------------

const WESTERN_EUROPEAN = new Set([
  "Italian", "Florentine", "Sienese", "Venetian", "Netherlandish", "Flemish", "Dutch",
  "German", "French", "Spanish", "English", "British", "Austrian", "Swiss", "Belgian",
]);

const SOURCES = {
  cameoMagna: {
    name: "CAMEO materials database, Museum of Fine Arts, Boston: \"Magna Plastic Colors\"",
    url: "https://cameo.mfa.org/wiki/Magna_Plastic_Colors",
  },
  kressTempera: {
    name: "Kress Program in Paintings Conservation, University of Delaware: \"Egg tempera\"",
    url: "https://artcons.artsci.udel.edu/kress/historical-materials-techniques/entry/7152",
  },
  metGold: {
    name: "Jennifer Meagher, \"Italian Painting of the Later Middle Ages,\" The Met, Heilbrunn Timeline of Art History (2010)",
    url: "https://www.metmuseum.org/essays/italian-painting-of-the-later-middle-ages",
  },
};

const MATERIAL_FACTS = [
  {
    id: "acrylic",
    applies: (m) => /\bacrylic\b/.test(m),
    title: "Acrylic paint",
    text:
      "The medium is acrylic. Artists' acrylic paints were first sold commercially in the late 1940s " +
      "(Bocour's Magna colors, released in 1947), so an acrylic painting almost certainly dates from the mid-1940s or later.",
    source: SOURCES.cameoMagna,
  },
  {
    id: "tempera",
    applies: (m, culture) => /\btempera\b/.test(m) && /\b(panel|wood)\b/.test(m) && WESTERN_EUROPEAN.has(culture),
    title: "Tempera on panel",
    text:
      "This is tempera on a wooden panel. In Western European painting, egg tempera was the standard medium " +
      "for panel painting until oil paint largely replaced it during the High Renaissance. It points toward " +
      "an earlier date, though some later artists kept using tempera, so it isn't proof by itself.",
    source: SOURCES.kressTempera,
  },
  {
    id: "gold",
    applies: (m, culture) => /\bgold\b/.test(m) && /\b(panel|tempera)\b/.test(m) && culture === "Italian",
    title: "Gold leaf",
    text:
      "The medium includes gold. Gold-ground panels spread through Italian painting in the 13th century: " +
      "painters laid gold leaf over a reddish clay called bole, then burnished and punched it. These methods are " +
      "described in Cennino Cennini's painting handbook, written around 1390.",
    source: SOURCES.metGold,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clean = (s) =>
  typeof s === "string"
    ? s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    : "";

function museumSource(record) {
  return { name: "Harvard Art Museums catalog record", url: record.url };
}

function primaryArtist(record) {
  // Only use a person the museum names plainly as "Artist". Skip "Attributed to",
  // "Workshop of", "Follower of", "After", etc., because their dates don't bound the painting.
  return (record.people || []).find((p) => p.role === "Artist" && !p.prefix) || null;
}

function artistClue(record) {
  const p = primaryArtist(record);
  if (!p || !p.displaydate) return null;
  const d = clean(p.displaydate);
  const src = museumSource(record);

  const lived = d.match(/^(?:c\.\s*)?(\d{3,4})\s*[-–]\s*(?:c\.\s*)?(\d{3,4})$/);
  if (lived) {
    return {
      kind: "artist", strength: 3, title: "The artist's lifetime", source: src,
      text: `The museum records the artist, ${p.name}, as living ${lived[1]}–${lived[2]}. The painting had to be made within that span.`,
    };
  }
  const born = d.match(/^born\s+(\d{4})$/i);
  if (born) {
    return {
      kind: "artist", strength: 3, title: "The artist's birth year", source: src,
      text: `The museum records the artist, ${p.name}, as born in ${born[1]}, so the painting is later than that.`,
    };
  }
  if (/^(active|fl\.|flourished)/i.test(d)) {
    return {
      kind: "artist", strength: 3, title: "When the artist worked", source: src,
      text: `The museum describes the artist, ${p.name}, as ${d}.`,
    };
  }
  return null; // unrecognized format: show nothing rather than guess
}

function sitterClue(record) {
  // Titles like "Benjamin Waterhouse (1754-1846)" give a person's life dates.
  const m = (record.title || "").match(/\((\d{4})\s*[-–]\s*(\d{4})\)/);
  if (!m) return null;
  return {
    kind: "title", strength: 2, title: "Dates in the title", source: museumSource(record),
    text:
      `The work's title gives a person's life dates: ${m[1]}–${m[2]}. ` +
      "When a painting depicts that person, it is often (though not always) made during their lifetime.",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildClues(record) {
  const clues = [];
  const culture = clean(record.culture);
  const medium = clean(record.medium).toLowerCase();

  if (culture) {
    clues.push({
      kind: "culture", strength: 1, title: "Culture", source: museumSource(record),
      text: `The museum catalogs this painting as ${culture}.`,
    });
  }

  for (const f of MATERIAL_FACTS) {
    if (medium && f.applies(medium, culture)) {
      clues.push({ kind: "material", strength: 2, title: f.title, text: f.text, source: f.source, fact: f.id });
    }
  }

  const s = sitterClue(record);
  if (s) clues.push(s);

  const period = clean(record.period);
  if (period) {
    clues.push({
      kind: "period", strength: 3, title: "Historical period", source: museumSource(record),
      text: `The museum assigns this work to the period: “${period}.”`,
    });
  }

  const a = artistClue(record);
  if (a) clues.push(a);

  // vaguest first, most telling last
  return clues.sort((x, y) => x.strength - y.strength);
}

export function museumNote(record) {
  // Curator-written text, shown only after the guess (it often states the date).
  const candidates = [
    clean(record.labeltext),
    ...(record.contextualtext || []).map((c) => clean(c && c.text)),
    clean(record.description),
    clean(record.commentary),
  ].filter((t) => t.length > 40);
  if (!candidates.length) return null;
  const text = candidates[0];
  return {
    text: text.length > 700 ? text.slice(0, 700).replace(/\s+\S*$/, "") + "…" : text,
    truncated: text.length > 700,
    source: museumSource(record),
  };
}

// Visual hallmarks: "what to look for" in painting from a given time and place.
//
// These describe general traits of a tradition, NOT claims about any specific painting.
// Every hallmark carries the exact source quote it is based on, plus a link to the source.
// A tradition is chosen only from the museum's own catalog data (culture, period, dates).

const S = {
  metKano: { name: "The Met: The Kano School of Painting", url: "https://www.metmuseum.org/essays/the-kano-school-of-painting" },
  metJapan1400: { name: "The Met: Japan, 1400–1600 A.D.", url: "https://82nd-and-fifth.metmuseum.org/toah/ht/08/eaj.html" },
  metRinpa: { name: "The Met: Rinpa Painting Style", url: "https://www.metmuseum.org/essays/rinpa-painting-style" },
  hamNanga: { name: "Harvard Art Museums: Focus on the Feinberg Collection: Nanga Painting", url: "https://harvardartmuseums.org/article/focus-on-the-feinberg-collection-nanga-painting" },
  metOkyo: { name: "The Met: Maruyama Ōkyo, White Herons", url: "https://www.metmuseum.org/art/collection/search/49031" },
  jaanusNihonga: { name: "JAANUS (Columbia University): nihonga", url: "https://projects.mcah.columbia.edu/jaanus/node/2121" },
  momat: { name: "National Museum of Modern Art, Tokyo: 2021-1 MOMAT Collection Special", url: "https://www.momat.go.jp/en?p=125051" },

  metYuan: { name: "The Met: Yuan Dynasty (1271–1368)", url: "https://www.metmuseum.org/essays/yuan-dynasty-1271-1368" },
  metChLandscape: { name: "The Met: Landscape Painting in Chinese Art", url: "https://www.metmuseum.org/essays/landscape-painting-in-chinese-art" },
  metMing: { name: "The Met: Ming Dynasty (1368–1644)", url: "https://www.metmuseum.org/essays/ming-dynasty-1368-1644" },
  metQingTrad: { name: "The Met: The Qing Dynasty (1644–1911): The Traditionalists", url: "https://www.metmuseum.org/essays/the-qing-dynasty-1644-1911-the-traditionalists" },
  metQingPaint: { name: "The Met: The Qing Dynasty (1644–1911): Painting", url: "https://www.metmuseum.org/essays/the-qing-dynasty-1644-1911-painting" },
  metQingCourt: { name: "The Met: The Qing Dynasty: The Courtiers, Officials, and Professional Artists", url: "https://www.metmuseum.org/essays/the-qing-dynasty-1644-1911-the-courtiers-officials-and-professional-artists" },
  cernuschi: { name: "Musée Cernuschi: The Shanghai School", url: "https://www.cernuschi.paris.fr/en/node/251" },

  metKorRen: { name: "The Met: Art of the Korean Renaissance, 1400–1600", url: "https://www.metmuseum.org/essays/art-of-the-korean-renaissance-1400-1600" },
  metKorLand: { name: "The Met: Mountain and Water: Korean Landscape Painting, 1400–1800", url: "https://www.metmuseum.org/essays/mountain-and-water-korean-landscape-painting-1400-1800" },
  metKorGenre: { name: "The Met: Work and Leisure: Eighteenth-Century Genre Painting in Korea", url: "https://www.metmuseum.org/essays/work-and-leisure-eighteenth-century-genre-painting-in-korea" },
  metYangban: { name: "The Met: Yangban: The Cultural Life of the Joseon Literati", url: "https://www.metmuseum.org/essays/yangban-the-cultural-life-of-the-joseon-literati" },
  metChaek: { name: "The Met: Korean Chaekgeori Paintings", url: "https://www.metmuseum.org/essays/korean-chaekgeori-paintings" },

  metItalyMA: { name: "The Met: Italian Painting of the Later Middle Ages", url: "https://www.metmuseum.org/essays/italian-painting-of-the-later-middle-ages" },
  metAngelico: { name: "The Met: Fra Angelico (ca. 1395–1455)", url: "https://www.metmuseum.org/essays/fra-angelico-guido-di-pietro-ca-1395-1455" },
  shPerspective: { name: "Smarthistory: Linear Perspective: Brunelleschi's Experiment", url: "https://smarthistory.org/linear-perspective" },
  metEarlyNeth: { name: "The Met: Early Netherlandish Painting", url: "https://www.metmuseum.org/essays/early-netherlandish-painting" },
  ngVanEyck: { name: "National Gallery, London: Jan van Eyck", url: "https://www.nationalgallery.org.uk/artists/jan-van-eyck" },
  metRubens: { name: "The Met: Peter Paul Rubens and Anthony van Dyck: Paintings", url: "https://www.metmuseum.org/essays/peter-paul-rubens-1577-1640-and-anthony-van-dyck-1599-1641-paintings" },
  metGenre: { name: "The Met: Genre Painting in Northern Europe", url: "https://www.metmuseum.org/essays/genre-painting-in-northern-europe" },
  metDutchLand: { name: "The Met: Landscape Painting in the Netherlands", url: "https://www.metmuseum.org/essays/landscape-painting-in-the-netherlands" },
  metStillLife: { name: "The Met: Still-Life Painting in Northern Europe, 1600–1800", url: "https://www.metmuseum.org/essays/still-life-painting-in-northern-europe-1600-1800" },

  metBoucher: { name: "The Met: François Boucher (1703–1770)", url: "https://www.metmuseum.org/essays/franois-boucher-1703-1770" },
  metDavid: { name: "The Met: The Legacy of Jacques Louis David (1748–1825)", url: "https://www.metmuseum.org/essays/the-legacy-of-jacques-louis-david-1748-1825" },
  metImpressionism: { name: "The Met: Impressionism: Art and Modernity", url: "https://www.metmuseum.org/essays/impressionism-art-and-modernity" },
  metPostImp: { name: "The Met: Post-Impressionism", url: "https://www.metmuseum.org/essays/post-impressionism" },
  metCopley: { name: "The Met: John Singleton Copley (1738–1815)", url: "https://www.metmuseum.org/essays/john-singleton-copley-1738-1815" },
  metHudson: { name: "The Met: The Hudson River School", url: "https://www.metmuseum.org/essays/the-hudson-river-school" },
  metAshcan: { name: "The Met: The Ashcan School", url: "https://www.metmuseum.org/essays/the-ashcan-school" },
  metAbEx: { name: "The Met: Abstract Expressionism", url: "https://www.metmuseum.org/essays/abstract-expressionism" },
};

const has = (s, re) => re.test(s || "");

// Each tradition: when it applies (from catalog data only), its name, and hallmarks.
// A hallmark may have `when: [start, end]` if the source ties it to only part of the span.
export const TRADITIONS = [
  // ---------------- Japan ----------------
  {
    id: "jp-muromachi", name: "Muromachi-period Japanese painting",
    match: (r) => r.culture === "Japanese" && has(r.period, /Muromachi/),
    hallmarks: [
      { text: "Mostly ink, with little or no color, strong brushwork, and Chinese subjects such as Zen patriarchs and landscapes.",
        quote: "Chinese-style painting was characterized by a strong emphasis on brushwork, predominance of ink with little or no use of pigments, and preference for Chinese subjects, especially images of Zen patriarchs and landscapes.", src: S.metKano },
      { text: "Atmospheric ink-monochrome landscapes modeled on Chinese Southern Song and Yuan painting.",
        quote: "Shūbun's atmospheric and expressionistic ink-monochrome landscapes, like those of his contemporaries, are inspired by continental examples, specifically Southern Song and Yuan landscape paintings.", src: S.metJapan1400 },
      { text: "Colorful, richly detailed scenes of everyday life on folding screens were just beginning to appear.",
        quote: "This colorful, richly detailed panorama of a variety of people, sites, and activities mounted on a pair of six-fold screens marks the beginning of an interest in genre painting in the Muromachi period.", src: S.metJapan1400 },
    ],
  },
  {
    id: "jp-momoyama", name: "Momoyama-period Japanese painting",
    match: (r) => r.culture === "Japanese" && has(r.period, /Momoyama/),
    hallmarks: [
      { text: "Bright colors, bold brushwork, and glittering gold leaf.",
        quote: "The bright colors, bold brushwork, and glittering gold leaf of these paintings exemplify the magnificent artistic style characteristic of this period, known as Azuchi-Momoyama.", src: S.metJapan1400 },
      { text: "Sliding doors and folding screens with oversized animals, figures, and nature scenes set against gold (Kano Eitoku).",
        quote: "His series of sliding doors (fusuma) and folding screens (byōbu) painted with oversize animals, figures, and nature scenes set against scintillating gold foil", src: S.metKano },
    ],
  },
  {
    id: "jp-edo", name: "Edo-period Japanese painting",
    intro: "Edo painting had several major schools. Compare the painting with each:",
    match: (r) => r.culture === "Japanese" && has(r.period, /\bEdo\b/),
    hallmarks: [
      { school: "Kano school", text: "Kano Tan'yū created a style more restrained than the grand Momoyama era before it, with renewed interest in ink monochrome.",
        quote: "Tan'yū created a style that was more restrained than the grandeur popular during the preceding Momoyama era, incorporating a renewed interest on ink monochrome.", src: S.metKano },
      { school: "Rinpa", text: "Vibrant color applied in a highly decorative, patterned manner. One leading Rinpa painter often worked on a gold ground with simplified, abstracted forms.",
        quote: "Working in vivid colors or ink monochrome, often on gold ground, the prolific and versatile artist developed a painting style that was more abstracted and simplified than the compositions of his predecessors. … Rinpa artists with vibrant colors applied in a highly decorative and patterned manner.", src: S.metRinpa },
      { school: "Literati (Nanga)", text: "Chinese-style landscapes with sharply restricted color and economical, deliberately unpolished brushwork.",
        quote: "depicts a pristine Chinese landscape … the use of color is severely curtailed … Created with economical brushwork … deliberately unpolished ink paintings", src: S.hamNanga },
      { school: "Maruyama-Shijō", text: "Naturalism based on sketching from life, often using soft, misty wash instead of ink outlines (Maruyama Ōkyo).",
        quote: "proponent of naturalism in painting … practiced sketching from life … soft, misty wash rather than ink outline", src: S.metOkyo },
    ],
  },
  {
    id: "jp-modern", name: "Modern Japanese painting (Meiji, Taishō, early Shōwa)",
    match: (r) => r.culture === "Japanese" && has(r.period, /Meiji|Taish|Sh[oō]wa/),
    hallmarks: [
      { text: "Nihonga (\"Japanese-style painting,\" a term from the Meiji period): brilliant mineral pigments on paper or silk.",
        quote: "Nihonga artists typically utilize brilliant mineral pigments and strive for refined surface effects, … painted on paper and silk with traditional water-soluble and mineral pigments … The term came into use during the Meiji period", src: S.jaanusNihonga },
      { text: "Some Nihonga painters adopted realistic Western techniques such as shading.",
        quote: "in some cases nihonga artists also adopted realistic Western painting techniques such as shading.", src: S.jaanusNihonga },
      { text: "Meiji-era artists studied Western oil painting's shading and perspective, sometimes combining Western-style rendering with East Asian themes.",
        quote: "they studied and sought to master Western oil painting's techniques of shading and perspective, … we see a combination of East Asian themes and Western-style rendering.", src: S.momat },
    ],
  },

  // ---------------- China ----------------
  {
    id: "cn-yuan", name: "Yuan-dynasty Chinese painting",
    match: (r) => r.culture === "Chinese" && has(r.period, /Yuan dynasty/),
    hallmarks: [
      { text: "Brushwork that reads like calligraphy. Scholar-painters were no longer aiming for faithful depiction of nature.",
        quote: "In the hands of highly educated scholar-artists, brushwork became calligraphic and assumed an autonomy that transcended its function as a means of creating representational forms. … Yuan literati painters no longer took truth to nature as their goal", src: S.metYuan },
      { text: "Landscapes that refer to earlier masters' styles and express the artist's inner spirit.",
        quote: "learned references to the styles of earlier masters and, through calligraphic brushwork, the inner spirit of the artist", src: S.metChLandscape },
    ],
  },
  {
    id: "cn-ming", name: "Ming-dynasty Chinese painting",
    intro: "Ming painting had several main currents. Compare the painting with each:",
    match: (r) => r.culture === "Chinese" && has(r.period, /Ming dynasty/),
    hallmarks: [
      { school: "Court painting", text: "Large-scale landscapes, flower-and-bird compositions, and narrative figure scenes in a realistic manner.",
        quote: "Large-scale landscapes, flower-and-bird compositions, and figural narratives were particularly favored", src: S.metMing },
      { school: "Zhe school", text: "Descriptive ink-wash landscapes in the earlier Southern Song style.",
        quote: "the Zhe (Zhejiang Province) School of painters carried on the descriptive, ink-wash style of the Southern Song", src: S.metMing },
      { school: "Wu school (Suzhou)", text: "Expressive, calligraphic brushwork reviving Yuan scholar-painters (Shen Zhou, Wen Zhengming).",
        quote: "the Wu (Suzhou) school explored the expressive calligraphic styles of Yuan scholar-painters", src: S.metMing },
      { text: "Forms built up from a recognized set of brushstroke types.",
        quote: "each form is built up of a recognized set of brushstrokes", src: S.metMing },
    ],
  },
  {
    id: "cn-qing", name: "Qing-dynasty Chinese painting",
    intro: "Qing painting had several main currents. Compare the painting with each:",
    match: (r) => r.culture === "Chinese" && has(r.period, /Qing dynasty/),
    hallmarks: [
      { school: "Orthodox school", text: "Landscapes in a rigorously abstract style in the manner of the late-Ming master Dong Qichang (Wang Yuanqi).",
        quote: "Wang Yuanqi pursued a rigorously abstract style in the manner of Dong Qichang", src: S.metQingTrad },
      { school: "Individualists", text: "Deeply personal paintings that often carried a strong message of political protest.",
        quote: "who practiced a deeply personal form of art that often carried a strong message of political protest", src: S.metQingPaint },
      { school: "Court painting", when: [1700, 1800], text: "Western linear perspective and light-and-shadow modeling combined with traditional Chinese brushwork.",
        quote: "Chinese court painters soon mastered the rudiments of Western linear perspective and chiaroscuro modeling", src: S.metQingCourt },
      { school: "Shanghai school", when: [1850, 1911], text: "An eruption of color in a tradition long dominated by ink.",
        quote: "the eruption of colour in a pictorial tradition dominated for centuries by the use of ink", src: S.cernuschi },
    ],
  },

  // ---------------- Korea ----------------
  {
    id: "kr-joseon", name: "Chosŏn-dynasty Korean painting",
    match: (r) => r.culture === "Korean" && has(r.period, /Chos[oŏ]n|Joseon/),
    hallmarks: [
      { when: [1400, 1600], text: "Some early Chosŏn landscapes: cloudlike mountains and pine trees, dramatic contrasts of solid and empty space, and light versus dark ink, after the Chinese master Guo Xi.",
        quote: "the cloudlike mountain forms and the pine trees … the dramatic interpenetration of solids and voids … the effective contrast between light and dark ink tones … the Northern Song landscapist par excellence, Guo Xi", src: S.metKorRen },
      { when: [1400, 1800], text: "In landscapes, people appear tiny or not at all.",
        quote: "Within the powerful, awe-inspiring landscape, the human figure appears in diminutive form, or not at all.", src: S.metKorLand },
      { when: [1700, 1800], text: "\"True-view\" landscapes of real Korean places, with cropped compositions and bold, sweeping brushwork (Jeong Seon).",
        quote: "its cropped composition and bold, sweeping brushwork", src: S.metKorLand },
      { when: [1700, 1800], text: "Genre scenes of ordinary people's daily activities, some on blank backgrounds.",
        quote: "genre painting refers to pictures of people's daily activities … some placed in a landscape setting and others on blank backgrounds", src: S.metKorGenre },
      { text: "Ink monochrome bamboo, orchid, plum blossom, and chrysanthemum, favorite subjects of scholar-painters.",
        quote: "Ink monochrome paintings of bamboo, orchid, plum blossom, and chrysanthemum were especially popular among the yangban", src: S.metYangban },
      { when: [1770, 1910], text: "Chaekgeori screens: piles of colorful books and objects drawn with Western perspective and shading.",
        quote: "Sets of books with colorful coverings are piled three or four high and at various angles. … which incorporates Western linear perspective and shading techniques.", src: S.metChaek },
    ],
  },

  // ---------------- Europe ----------------
  {
    id: "it-trecento", name: "Italian painting of the 1300s",
    match: (r, mid) => /^(Italian|Sienese|Florentine|Venetian)$/.test(r.culture) && mid >= 1290 && mid < 1400,
    hallmarks: [
      { text: "Wooden panels with burnished gold-leaf surfaces.",
        quote: "Through the fourteenth century, the primary support for portable paintings … was the wooden panel. … The gilded surface was rubbed with a hard-tipped instrument to smooth and polish the gold leaf,", src: S.metItalyMA },
      { text: "Haloes with intricate patterns punched into the gold.",
        quote: "Punching was often used to achieve the intricately detailed haloes surrounding the heads of holy figures.", src: S.metItalyMA },
      { text: "Brilliant, pure colors from egg tempera.",
        quote: "This medium produces a brilliant, pure hue.", src: S.metItalyMA },
      { text: "Altarpieces with the Madonna and Child flanked by saints, and small scenes in a strip below (the predella).",
        quote: "Usually, the Madonna and Child were shown on the main panels, flanked by saints and apostles, … A strip of smaller panels—called the predella—at the bottom of the altarpiece", src: S.metItalyMA },
    ],
  },
  {
    id: "it-renaissance", name: "Italian Early Renaissance painting (1400s)",
    match: (r, mid) => /^(Italian|Sienese|Florentine|Venetian)$/.test(r.culture) && mid >= 1400 && mid < 1500,
    hallmarks: [
      { text: "Linear perspective: lines receding to a vanishing point to create the illusion of 3D space.",
        quote: "a vanishing point, which is at the viewer's horizon line … a series of orthogonals or illusionistically receding diagonals … an incredibly realistic illusion of three-dimensional space on a two-dimensional surface", src: S.shPerspective },
      { text: "Solid-looking figures modeled with light and shadow.",
        quote: "the volumetric modeling of forms with light and shadow", src: S.metAngelico },
      { text: "Figures set in logically constructed spaces or against naturalistic landscapes. Gold grounds still appear too.",
        quote: "the depiction of three-dimensional forms in logically constructed spatial settings … against a naturalistic landscape background … Tempera on wood, gold ground", src: S.metAngelico },
    ],
  },
  {
    id: "early-netherlandish", name: "Early Netherlandish painting",
    match: (r, mid) => /^(Netherlandish|Flemish)$/.test(r.culture) && mid >= 1400 && mid < 1530,
    hallmarks: [
      { text: "Oil paint built up in translucent layers (glazes).",
        quote: "using an oil medium, which allowed the building up of paint in translucent layers, or glazes", src: S.ngVanEyck },
      { text: "Astonishing, almost microscopic detail.",
        quote: "details of astonishing and microscopic verisimilitude", src: S.metEarlyNeth },
      { text: "Blue-tinged mountains on the distant horizon.",
        quote: "as limitless as the blue-tinged mountains of the distant horizons in their pictures", src: S.metEarlyNeth },
    ],
  },
  {
    id: "flemish-baroque", name: "Flemish Baroque painting (Rubens, Van Dyck)",
    match: (r, mid) => r.culture === "Flemish" && mid >= 1600 && mid < 1700,
    hallmarks: [
      { text: "Brilliant brushwork, elegant figures, and luxurious drapery.",
        quote: "brilliant brushwork, graceful arrangement of elegant figures, and seemingly effortless displays of luxurious drapery", src: S.metRubens },
      { text: "Religious, mythological, and history subjects, and portraits.",
        quote: "As a painter of religious pictures, mythological scenes, classical and modern history, and portraits", src: S.metRubens },
    ],
  },
  {
    id: "dutch-golden-age", name: "Dutch Golden Age painting (1600s)",
    match: (r, mid) => r.culture === "Dutch" && mid >= 1600 && mid < 1700,
    hallmarks: [
      { text: "Scenes from everyday life, both high and low.",
        quote: "depicted scenes from everyday life, both high and low", src: S.metGenre },
      { text: "Clear, balanced, orderly compositions with carefully naturalistic lighting.",
        quote: "exhibit compositional clarity, balance, and order, with painstakingly naturalistic lighting effects.", src: S.metGenre },
      { text: "Landscapes in a tonal palette with convincing light and atmosphere, wide views, and towering clouds.",
        quote: "a unified space, convincing light and atmosphere, a tonal palette, and motifs based on direct observation … wide views extending to the horizon and towering vaults of clouds", src: S.metDutchLand },
      { text: "Still lifes of flowers, everyday food and drink on tabletops, or vanitas skulls.",
        quote: "Floral still lifes were especially prominent in the early 1600s … arranged familiar foods (ham, cheese, oysters, and so on) and glasses of wine or beer on wooden tabletops … Vanitas still lifes were a specialty of Leiden artists", src: S.metStillLife },
    ],
  },
  {
    id: "fr-rococo", name: "French Rococo painting",
    match: (r, mid) => r.culture === "French" && mid >= 1720 && mid < 1770,
    hallmarks: [
      { text: "A painterly surface and a light, high-toned palette favoring blues and pinks (Boucher).",
        quote: "Boucher's insistence on a painterly surface and adoption of a high-toned palette favoring blues and pinks", src: S.metBoucher },
      { text: "Idealized countryside scenes with shepherds and shepherdesses in silk.",
        quote: "populated by shepherds and shepherdesses in silk dress, enacting scenes of erotic and sentimental love.", src: S.metBoucher },
    ],
  },
  {
    id: "fr-neoclassical", name: "French Neoclassical painting",
    match: (r, mid) => r.culture === "French" && mid >= 1770 && mid < 1820,
    hallmarks: [
      { text: "Crisp outlines, sculpted-looking forms, and polished surfaces (David).",
        quote: "David championed a style of rigorous contours, sculpted forms, and polished surfaces", src: S.metDavid },
      { text: "A smooth surface with no visible brushwork.",
        quote: "creating a smooth surface with no visible brushwork", src: S.metDavid },
      { text: "Subjects from ancient history.",
        quote: "drew upon subjects from ancient history", src: S.metDavid },
    ],
  },
  {
    id: "fr-impressionism", name: "French painting in the age of Impressionism",
    match: (r, mid) => r.culture === "French" && mid >= 1860 && mid < 1886,
    hallmarks: [
      { text: "Loose, quick-looking brushwork.",
        quote: "The artists' loose brushwork gives an effect of spontaneity and effortlessness", src: S.metImpressionism },
      { text: "Shadows and highlights painted in color rather than gray or black.",
        quote: "Rather than neutral white, grays, and blacks, Impressionists often rendered shadows and highlights in color.", src: S.metImpressionism },
      { text: "Modern leisure, such as boating and bathing spots.",
        quote: "The boating and bathing establishments that flourished in these regions became favorite motifs.", src: S.metImpressionism },
    ],
  },
  {
    id: "fr-postimp", name: "French painting in the age of Post-Impressionism",
    match: (r, mid) => r.culture === "French" && mid >= 1886 && mid < 1906,
    hallmarks: [
      { text: "Tiny dabs of pure color placed side by side (Seurat).",
        quote: "placing tiny dabs of pure colors adjacent to one another", src: S.metPostImp },
      { text: "Solid patches of color and clearly defined forms (Gauguin).",
        quote: "an approach characterized by solid patches of color and clearly defined forms", src: S.metPostImp },
      { text: "Thick, bright, rapidly applied paint with dark outlines (Van Gogh).",
        quote: "Van Gogh's style of rapidly applied, thick, bright colors with dark, definitive outlines", src: S.metPostImp },
    ],
  },
  {
    id: "us-colonial", name: "American colonial and early republic portraiture",
    match: (r, mid) => r.culture === "American" && mid >= 1700 && mid < 1830,
    hallmarks: [
      { text: "Portraits that use the sitter's body, setting, and objects to signal social position (Copley).",
        quote: "He adroitly choreographed bodies, settings, and objects into visual biographies that could calibrate social position.", src: S.metCopley },
    ],
  },
  {
    id: "us-hudson", name: "American painting in the era of the Hudson River School",
    match: (r, mid) => r.culture === "American" && mid >= 1825 && mid < 1875,
    hallmarks: [
      { text: "Dramatic forms and vigorous technique showing nature as awe-inspiring and fearsome, the \"Sublime\" (Thomas Cole).",
        quote: "Cole's style was marked by dramatic forms and vigorous technique, reflecting the British aesthetic theory of the Sublime, or fearsome, in nature.", src: S.metHudson },
      { text: "In later works, light falling on the land and the air around it.",
        quote: "whose most conspicuous features often were the light influencing terrestrial forms and the air bathing them.", src: S.metHudson },
    ],
  },
  {
    id: "us-ashcan", name: "American painting in the era of the Ashcan School",
    match: (r, mid) => r.culture === "American" && mid >= 1900 && mid < 1930,
    hallmarks: [
      { text: "A dark palette and gestural brushwork.",
        quote: "they depended upon the dark palette and gestural brushwork of Diego Velázquez, Frans Hals,", src: S.metAshcan },
      { text: "New York's energy, including its rougher side.",
        quote: "concentrated on portraying New York's vitality and recording its seamy side", src: S.metAshcan },
    ],
  },
  {
    id: "us-abex", name: "American painting in the era of Abstract Expressionism",
    match: (r, mid) => r.culture === "American" && mid >= 1943 && mid < 1966,
    hallmarks: [
      { text: "Mainly abstract imagery, often on a vast scale.",
        quote: "For the time, the works were vast in scale. … In either case, the imagery was primarily abstract.", src: S.metAbEx },
      { text: "Dynamic gestural marks charging every inch of the picture, or broad fields of color.",
        quote: "an art of dynamic gesture in which every inch of a picture is fully charged. … simplified, large-format, color-dominated fields.", src: S.metAbEx },
    ],
  },
];

// Returns { tradition, hallmarks } for a museum record, or null.
export function findHallmarks(record) {
  const begin = record.datebegin;
  const end = record.dateend && record.dateend >= begin ? record.dateend : begin;
  const mid = (begin + end) / 2;
  const t = TRADITIONS.find((x) => x.match(record, mid));
  if (!t) return null;
  // keep hallmarks whose sub-span (if any) overlaps the museum's date range
  const hallmarks = t.hallmarks.filter((h) => !h.when || (end >= h.when[0] && begin <= h.when[1]));
  if (!hallmarks.length) return null;
  return { tradition: t, hallmarks };
}

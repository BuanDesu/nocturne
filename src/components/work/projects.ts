export type ArtId = "lumen" | "halcyon" | "meridian" | "sable" | "orbit";

export interface ProjectHighlight {
  label: string;
  value: string;
}

export interface Project {
  id: ArtId;
  name: string;
  discipline: string;
  year: string;
  tags: string[];
  role: string;
  stack: string[];
  deck: string;
  paragraphs: [string, string];
  highlights: [ProjectHighlight, ProjectHighlight, ProjectHighlight];
}

/**
 * Five projects, one page each in the monograph. Copy is written in the
 * studio's voice: short, technical, specific — no superlatives.
 */
export const PROJECTS: Project[] = [
  {
    id: "lumen",
    name: "Lumen",
    discipline: "Immersive retail",
    year: "2025",
    tags: ["Art direction", "WebGL", "Spatial"],
    role: "Art direction · WebGL · Interaction",
    stack: ["WebGL", "GLSL", "GSAP", "Lenis", "Vite"],
    deck: "A flagship store that exists only as light.",
    paragraphs: [
      "Lumen sells objects by withholding them. The flagship lives inside one continuous shader surface — no pages, no cuts — where every aisle is a shift in luminance and every product arrives as a caustic reflection. The catalogue is rendered, not photographed.",
      "The discipline was the frame budget: eleven milliseconds, then the picture had to hold. Light is composed rather than computed — a custom uniform scheduler puts every layer that is not contributing to sleep. On phones the raymarch halves and the piece still holds sixty frames.",
    ],
    highlights: [
      { label: "Images shipped", value: "00" },
      { label: "Frame budget", value: "11 ms" },
      { label: "Frame rate", value: "60 fps" },
    ],
  },
  {
    id: "halcyon",
    name: "Halcyon",
    discipline: "Editorial engine",
    year: "2024",
    tags: ["Design system", "Front-end", "Type"],
    role: "Design system · Front-end · Typography",
    stack: ["React", "TypeScript", "Variable fonts", "Canvas"],
    deck: "A quarterly that argues through its grid.",
    paragraphs: [
      "Halcyon is an editorial engine for a quarterly that wanted its grid to feel argued rather than declared. Twelve columns, each able to carry its own baseline rhythm. The desk writes intent; the front end resolves it into measure, masthead and margin.",
      "We printed the first issue to find the CSS — seven rounds of paper, then a variable axis mapped to reading distance. The same page reads at 320 pixels and at broadsheet. Nothing is a template; every spread carries its own negotiation.",
    ],
    highlights: [
      { label: "Grid", value: "12 col" },
      { label: "Variants", value: "Unbounded" },
      { label: "Paper proofs", value: "07" },
    ],
  },
  {
    id: "meridian",
    name: "Meridian",
    discipline: "Fintech narrative",
    year: "2024",
    tags: ["Narrative", "Data", "Motion"],
    role: "Product narrative · Motion · Data visualisation",
    stack: ["SVG", "D3 scales", "GSAP", "ScrollTrigger"],
    deck: "Infrastructure, drawn as territory.",
    paragraphs: [
      "Meridian is financial infrastructure with a story told in ledgers. We drew it as territory: latitude lines of capital, contour maps of settlement time. Every chart shares one coordinate system, so scrolling feels like travelling rather than paging.",
      "Numbers are set in tabular mono and only animate to explain, never for effect. The single flourish is a horizon that follows scroll velocity. It carries no legend because it does not mean anything — it is the weather.",
    ],
    highlights: [
      { label: "Coordinate systems", value: "01" },
      { label: "Generated SVG", value: "2.4 MB" },
      { label: "Decorative motion", value: "None" },
    ],
  },
  {
    id: "sable",
    name: "Sable",
    discipline: "Fashion commerce",
    year: "2023",
    tags: ["Commerce", "Canvas", "Art direction"],
    role: "Art direction · Commerce · Motion",
    stack: ["React", "Canvas 2D", "Shopify API", "GSAP"],
    deck: "A house that sells cloth, not clothes.",
    paragraphs: [
      "Sable opens with fabric before it shows a single garment: four thousand spring-linked threads that answer the cursor like a hand testing weight. The product arrives only after the material has been felt.",
      "Checkout is the quiet part — one column, two steps, native inputs, nothing moving while people decide. Conversion rose nineteen percent, which we choose to attribute to restraint.",
    ],
    highlights: [
      { label: "Threads", value: "4,000" },
      { label: "Checkout", value: "2 steps" },
      { label: "Conversion", value: "+19%" },
    ],
  },
  {
    id: "orbit",
    name: "Orbit",
    discipline: "Music product launch",
    year: "2022",
    tags: ["Launch", "WebGL", "Sound-reactive"],
    role: "Concept · WebGL · Sound-reactive motion",
    stack: ["WebGL", "Web Audio", "GSAP", "Lenis"],
    deck: "A launch page you hear before you read.",
    paragraphs: [
      "Orbit is a music tool that had to be heard before it was understood. The hero is a single orbital system — nine hundred particles, one audio file, no fixed choreography. Allow sound and the system follows the low end; refuse it and the orbits drift on a seeded path.",
      "Sound is opt-in, always. The page performs perfectly in silence. The case became a study in consent as an interaction: nothing listens until you ask it to, and the request is never repeated.",
    ],
    highlights: [
      { label: "Particles", value: "900" },
      { label: "Audio sources", value: "01" },
      { label: "Silent render", value: "Full" },
    ],
  },
];

export const projectByIndex = (index: number) => PROJECTS[((index % PROJECTS.length) + PROJECTS.length) % PROJECTS.length];

export const padIndex = (index: number) => String(index + 1).padStart(2, "0");

/**
 * Ready-to-drop TypeScript file for Frontend (`src/content/academy.ts`).
 * Implements the exact Section 4 & Section 6 requirements from "Star Detective Academy: What To Do":
 * - No backend call required for Stages 1-3 (saves progress in localStorage `{ xp, stage }`).
 * - Includes the "Skip to training" unlock helper so Stages 4 & 5 are never locked for judges.
 */

export interface LessonCard {
  title: string;
  text: string;
  icon?: string;
}

export interface StageQuestion {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  feedback: string;
  xpReward: number;
}

export interface AcademyStage {
  stage: 1 | 2 | 3 | 4 | 5;
  name: string;
  heading: string;
  description: string;
  cards?: LessonCard[];
  question?: StageQuestion;
}

export interface AcademyProgress {
  xp: number;
  stage: number; // Highest unlocked stage (1..5)
}

const STORAGE_KEY = "star_detective_progress";

export function getProgress(): AcademyProgress {
  if (typeof window === "undefined") return { xp: 0, stage: 1 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { xp: 0, stage: 1 };
    const parsed = JSON.parse(raw);
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      stage: typeof parsed.stage === "number" ? parsed.stage : 1,
    };
  } catch {
    return { xp: 0, stage: 1 };
  }
}

export function completeStageQuestion(completedStage: number, xpEarned = 20): AcademyProgress {
  const current = getProgress();
  const nextStage = Math.max(current.stage, Math.min(5, completedStage + 1));
  const updated: AcademyProgress = {
    xp: current.xp + xpEarned,
    stage: nextStage,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function skipToTraining(): AcademyProgress {
  const current = getProgress();
  const updated: AcademyProgress = {
    xp: current.xp,
    stage: 5, // Unlocks both Stage 4 (Training) and Stage 5 (Explore) immediately for judges
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export const ACADEMY_STAGES: AcademyStage[] = [
  {
    stage: 1,
    name: "Baby Steps",
    heading: "Stage 1: Baby Steps",
    description: "Learn the key words of infrared astronomy.",
    cards: [
      {
        title: "Infrared light",
        text: "Infrared is light our eyes cannot see. We feel it as heat. Cold, dim objects in space that are invisible in normal light can glow in infrared.",
        icon: "flame",
      },
      {
        title: "False colour",
        text: "Because infrared is invisible, the colours in these images are added by software. Brighter colours mean more infrared light, not the object's real colour.",
        icon: "palette",
      },
      {
        title: "SPHEREx",
        text: "SPHEREx is a NASA space telescope launched in 2025. It maps the whole sky about every six months in 102 colours of infrared light.",
        icon: "satellite",
      },
      {
        title: "Stars and the 'fixed' sky",
        text: "Stars are so far away that they appear to stay in the same place for years. They make a steady background pattern.",
        icon: "sparkles",
      },
      {
        title: "Comets and asteroids",
        text: "Asteroids are chunks of rock and metal. Comets are icy bodies that can grow a glowing tail near the Sun. Both orbit the Sun, so they shift against the background stars.",
        icon: "orbit",
      },
      {
        title: "Brown dwarf",
        text: "A brown dwarf is bigger than a planet but too small to shine like a star. It is cool and faint, and shows up best in infrared.",
        icon: "circle-dot",
      },
      {
        title: "Glitch",
        text: "Sometimes the camera records a dot that is not a real object, for example when a particle from space hits the sensor. It appears in one image only.",
        icon: "zap-off",
      },
      {
        title: "Candidate",
        text: "A candidate is something that might be real but has not been confirmed. Scientists check candidates many times before calling anything a discovery.",
        icon: "search-check",
      },
    ],
    question: {
      question:
        "A bright dot appears in one image and is gone in the next, and it is smaller and sharper than any star. What is it most likely to be?",
      options: ["A new planet", "A camera glitch", "A galaxy"],
      correctIndex: 1,
      feedback: "Real objects show up in more than one image. A dot that appears once is usually a glitch.",
      xpReward: 20,
    },
  },
  {
    stage: 2,
    name: "Known Findings",
    heading: "Stage 2: Known Findings",
    description: "See how real objects were found by spotting movement.",
    cards: [
      {
        title: "Uranus, 1781",
        text: "William Herschel noticed a faint object that moved slowly against the stars. He first thought it was a comet. It was a new planet.",
        icon: "globe",
      },
      {
        title: "Ceres, 1801",
        text: "Giuseppe Piazzi saw a 'star' that changed position from night to night. It was Ceres, the first asteroid ever found.",
        icon: "compass",
      },
      {
        title: "Barnard's Star, 1916",
        text: "E. E. Barnard found a nearby star that drifts across the sky faster than any other star we know. Even so, it takes many years to move a noticeable amount.",
        icon: "move-up-right",
      },
      {
        title: "Pluto, 1930",
        text: "Clyde Tombaugh flipped back and forth between two photographs of the same sky, taken days apart. One dot jumped. That dot was Pluto. This is the same method you will use.",
        icon: "layers",
      },
      {
        title: "WISE 0855, 2014",
        text: "Astronomers compared infrared images taken at different times and found a very cold brown dwarf only about 7 light-years away, one of the Sun's nearest neighbours.",
        icon: "snowflake",
      },
      {
        title: "Comet 3I/ATLAS, 2025",
        text: "A survey telescope spotted a comet moving so fast that it must have come from another star system. It is only the third such visitor ever seen.",
        icon: "rocket",
      },
      {
        title: "Planet Nine",
        text: "Some astronomers think a large, unseen planet may orbit far beyond Neptune. Nobody has found it yet. If it exists, it would be found the same way: by spotting a faint dot that moves.",
        icon: "help-circle",
      },
    ],
    question: {
      question: "How did Clyde Tombaugh find Pluto?",
      options: [
        "He saw it through a telescope with his own eyes on one night",
        "He compared two photos of the same sky and looked for a dot that moved",
        "A spacecraft flew past it",
      ],
      correctIndex: 1,
      feedback: "Comparing images over time is one of the oldest and most successful ways to find objects in our solar system.",
      xpReward: 20,
    },
  },
  {
    stage: 3,
    name: "The Solar System",
    heading: "Stage 3: The Solar System",
    description: "Learn what is out there and why near things seem to move.",
    cards: [
      {
        title: "The Sun and planets",
        text: "The Sun sits at the centre. Eight planets orbit it: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.",
        icon: "sun",
      },
      {
        title: "The asteroid belt",
        text: "Between Mars and Jupiter lies a wide ring of rocky bodies. Most asteroids we see come from here.",
        icon: "disc",
      },
      {
        title: "The Kuiper Belt",
        text: "Beyond Neptune is a region of icy bodies, including Pluto. Objects here are far away, so they are faint and move slowly across the sky.",
        icon: "cloud-snow",
      },
      {
        title: "The far edge",
        text: "Much farther out, a huge cloud of icy bodies is thought to surround the solar system. Many comets are believed to come from there.",
        icon: "sparkles",
      },
      {
        title: "Measuring distance",
        text: "Astronomers use the distance from Earth to the Sun as a ruler. It is about 150 million kilometres and is called one astronomical unit (AU). Neptune is about 30 AU from the Sun.",
        icon: "ruler",
      },
      {
        title: "Why near things seem to move",
        text: "From a moving car, nearby trees rush past while distant hills barely shift. The sky works the same way: nearby objects shift between images, and distant stars stay put.",
        icon: "eye",
      },
      {
        title: "Fast and slow movers",
        text: "An asteroid can cross many pixels in a few days. A distant, slow object might shift by less than one pixel in six months. That is why patient comparison matters.",
        icon: "clock",
      },
    ],
    question: {
      question: "Two dots are in an image. Six months later, dot A has shifted and dot B has not. Which is probably closer to us?",
      options: ["Dot A", "Dot B", "They must be the same distance"],
      correctIndex: 0,
      feedback: "Nearby objects appear to move more. This is the key idea behind the whole search.",
      xpReward: 20,
    },
  },
  {
    stage: 4,
    name: "Training",
    heading: "Stage 4: Training",
    description: "Real SPHEREx images where we already know the answer. Spot what moved and learn how to tell real objects from glitches.",
  },
  {
    stage: 5,
    name: "Explore",
    heading: "Stage 5: Explore",
    description: "Compare SPHEREx images from different dates yourself. Anything you notice here is a candidate, not a discovery.",
  },
];

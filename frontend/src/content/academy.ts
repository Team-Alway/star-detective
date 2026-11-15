export type AcademyCard = { title: string; text: string; icon: string; intel?: string };
export type AcademyQuestion = { prompt: string; options: string[]; correctIndex: number; feedback: string; xp: number };
export type AcademyStage = { stage: number; name: string; subtitle: string; cards: AcademyCard[]; question: AcademyQuestion };

export const STAGE_QUESTION_XP = 20;

export const TRAINING_HEADING = "Stage 4 · Training";
export const TRAINING_DESCRIPTION =
  "Practice patches modelled on SPHEREx images, where we already know the answer. Spot what moved and learn how to tell real objects from glitches.";
export const EXPLORE_HEADING = "Stage 5 · Explore";
export const EXPLORE_DESCRIPTION =
  "Compare SPHEREx images from different dates yourself. Anything you notice here is a candidate, not a discovery.";

export const LESSON_STAGES: AcademyStage[] = [
  {
    "stage": 1,
    "name": "Baby Steps",
    "subtitle": "Learns the key words of infrared astronomy",
    "cards": [
      {
        "title": "Infrared light",
        "text": "Infrared is light our eyes cannot see. We feel it as heat. Cold, dim objects in space that are invisible in normal light can glow in infrared.",
        "icon": "flame",
        "intel": "Cold, faint objects glow in infrared heat where optical telescopes only see empty blackness."
      },
      {
        "title": "False colour",
        "text": "Because infrared is invisible, the colours in these images are added by software. Brighter colours mean more infrared light, not the object's real colour.",
        "icon": "palette",
        "intel": "Bright neon shades indicate infrared intensity levels, not what your eye would see in space."
      },
      {
        "title": "SPHEREx",
        "text": "SPHEREx is a NASA space telescope launched in 2025. It maps the whole sky about every six months in 102 colours of infrared light.",
        "icon": "satellite",
        "intel": "102 continuous infrared color bands provide a spectroscopic fingerprint for every patch of sky."
      },
      {
        "title": "Stars and the 'fixed' sky",
        "text": "Stars are so far away that they appear to stay in the same place for years. They make a steady background pattern.",
        "icon": "sparkles",
        "intel": "Background stars are so distant they serve as fixed celestial anchor points across decades."
      },
      {
        "title": "Comets and asteroids",
        "text": "Asteroids are chunks of rock and metal. Comets are icy bodies that can grow a glowing tail near the Sun. Both orbit the Sun, so they shift against the background stars.",
        "icon": "orbit",
        "intel": "Because asteroids and comets orbit our Sun, they visibly shift across the starry background in months or days."
      },
      {
        "title": "Brown dwarf",
        "text": "A brown dwarf is bigger than a planet but too small to shine like a star. It is cool and faint, and shows up best in infrared.",
        "icon": "circle-dot",
        "intel": "Too small to ignite nuclear fusion, brown dwarfs radiate faint residual heat best detected in infrared."
      },
      {
        "title": "Glitch",
        "text": "Sometimes the camera records a dot that is not a real object, for example when a particle from space hits the sensor. It appears in one image only.",
        "icon": "zap-off",
        "intel": "Cosmic rays hit the detector sensor once. If a bright blip only exists in one frame, it is almost certainly a glitch."
      },
      {
        "title": "Candidate",
        "text": "A candidate is something that might be real but has not been confirmed. Scientists check candidates many times before calling anything a discovery.",
        "icon": "search-check",
        "intel": "Every moving blip must be cross-matched against cataloged asteroids before it can be verified as a new discovery."
      }
    ],
    "question": {
      "prompt": "A bright dot appears in one image and is gone in the next, and it is smaller and sharper than any star. What is it most likely to be?",
      "options": [
        "A new planet",
        "A camera glitch",
        "A galaxy"
      ],
      "correctIndex": 1,
      "feedback": "Real objects show up in more than one image. A dot that appears once is usually a glitch.",
      "xp": 20
    }
  },
  {
    "stage": 2,
    "name": "Known Findings",
    "subtitle": "Sees how real objects were found by movement",
    "cards": [
      {
        "title": "Uranus, 1781",
        "text": "William Herschel noticed a faint object that moved slowly against the stars. He first thought it was a comet. It was a new planet.",
        "icon": "globe",
        "intel": "Herschel tracked a slowly drifting dot over multiple nights, discovering the first planet found by telescope."
      },
      {
        "title": "Ceres, 1801",
        "text": "Giuseppe Piazzi saw a 'star' that changed position from night to night. It was Ceres, the first asteroid ever found.",
        "icon": "compass",
        "intel": "Piazzi noticed a faint star changing coordinates night after night, unlocking the asteroid belt."
      },
      {
        "title": "Barnard's Star, 1916",
        "text": "E. E. Barnard found a nearby star that drifts across the sky faster than any other star we know. Even so, it takes many years to move a noticeable amount.",
        "icon": "move-up-right",
        "intel": "The fastest moving star across our sky, drifting 10.3 arcseconds per year due to proximity to our solar system."
      },
      {
        "title": "Pluto, 1930",
        "text": "Clyde Tombaugh flipped back and forth between two photographs of the same sky, taken days apart. One dot jumped. That dot was Pluto. This is the same method you will use.",
        "icon": "layers",
        "intel": "Tombaugh flipped back and forth between photographic plates on a blink comparator until one dot jumped."
      },
      {
        "title": "WISE 0855, 2014",
        "text": "Astronomers compared infrared images taken at different times and found a very cold brown dwarf only about 7 light-years away, one of the Sun's nearest neighbours.",
        "icon": "snowflake",
        "intel": "Discovered by comparing infrared survey epochs: a sub-zero brown dwarf just 7.2 light-years from Earth."
      },
      {
        "title": "Comet 3I/ATLAS, 2025",
        "text": "A survey telescope spotted a comet moving so fast that it must have come from another star system. It is only the third such visitor ever seen.",
        "icon": "rocket",
        "intel": "Extreme hyperbolic velocity revealed this object originated from outside our solar system."
      },
      {
        "title": "Planet Nine",
        "text": "Some astronomers think a large, unseen planet may orbit far beyond Neptune. Nobody has found it yet. If it exists, it would be found the same way: by spotting a faint dot that moves.",
        "icon": "help-circle",
        "intel": "A predicted massive world beyond Neptune that, if real, can only be found by detecting its faint multi-epoch orbital motion."
      }
    ],
    "question": {
      "prompt": "How did Clyde Tombaugh find Pluto?",
      "options": [
        "He saw it through a telescope with his own eyes on one night",
        "He compared two photos of the same sky and looked for a dot that moved",
        "A spacecraft flew past it"
      ],
      "correctIndex": 1,
      "feedback": "Comparing images over time is one of the oldest and most successful ways to find objects in our solar system.",
      "xp": 20
    }
  },
  {
    "stage": 3,
    "name": "The Solar System",
    "subtitle": "Learns what is out there and why near things seem to move",
    "cards": [
      {
        "title": "The Sun and planets",
        "text": "The Sun sits at the centre. Eight planets orbit it: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.",
        "icon": "sun",
        "intel": "The Sun contains 99.8% of the system's mass; eight major planets orbit in a roughly flat ecliptic plane."
      },
      {
        "title": "The asteroid belt",
        "text": "Between Mars and Jupiter lies a wide ring of rocky bodies. Most asteroids we see come from here.",
        "icon": "disc",
        "intel": "Millions of rocky remnants orbit between Mars and Jupiter, the most common fast-moving targets in sky surveys."
      },
      {
        "title": "The Kuiper Belt",
        "text": "Beyond Neptune is a region of icy bodies, including Pluto. Objects here are far away, so they are faint and move slowly across the sky.",
        "icon": "cloud-snow",
        "intel": "A vast frozen realm extending from Neptune (30 AU) past 50 AU, home to dwarf planets and slow-moving icy bodies."
      },
      {
        "title": "The far edge",
        "text": "Much farther out, a huge cloud of icy bodies is thought to surround the solar system. Many comets are believed to come from there.",
        "icon": "sparkles",
        "intel": "The Oort Cloud extends up to 100,000 AU — a spherical halo of billions of icy comets surrounding our solar system."
      },
      {
        "title": "Measuring distance",
        "text": "Astronomers use the distance from Earth to the Sun as a ruler. It is about 150 million kilometres and is called one astronomical unit (AU). Neptune is about 30 AU from the Sun.",
        "icon": "ruler",
        "intel": "1 AU = ~150 million km (Earth-Sun distance). Neptune orbits at 30 AU; the Kuiper belt extends to ~50 AU."
      },
      {
        "title": "Why near things seem to move",
        "text": "From a moving car, nearby trees rush past while distant hills barely shift. The sky works the same way: nearby objects shift between images, and distant stars stay put.",
        "icon": "eye",
        "intel": "Parallax effect: closer objects appear to jump significantly against the static, ultra-distant cosmic background."
      },
      {
        "title": "Fast and slow movers",
        "text": "An asteroid can cross many pixels in a few days. A distant, slow object might shift by less than one pixel in six months. That is why patient comparison matters.",
        "icon": "clock",
        "intel": "Near-Earth asteroids streak across pixels in hours; trans-Neptunian objects creep fractionally over months."
      }
    ],
    "question": {
      "prompt": "Two dots are in an image. Six months later, dot A has shifted and dot B has not. Which is probably closer to us?",
      "options": [
        "Dot A",
        "Dot B",
        "They must be the same distance"
      ],
      "correctIndex": 0,
      "feedback": "Nearby objects appear to move more. This is the key idea behind the whole search.",
      "xp": 20
    }
  }
];

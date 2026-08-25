export const business = {
  name: "Matken",
  legalName: "Matken Electrical",
  phoneDisplay: "(876) 568-2616",
  phoneHref: "+18765682616",
  locationLabel: "Jamaica",
};

export const liveContactTruth =
  "The verified public number is live. Planning tools and request forms stay on this device until a secure delivery endpoint is approved.";

export const mainNav = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "Planner", to: "/planner" },
  { label: "Resources", to: "/resources" },
  { label: "About", to: "/about" },
];

export const services = [
  {
    slug: "solar",
    label: "Solar & storage",
    shortLabel: "Solar",
    eyebrow: "Plan around your real energy needs",
    summary:
      "Explore solar generation, battery backup, monitoring, and a practical path from energy goals to a scoped consultation.",
    detail:
      "A good solar conversation starts with how the property uses power, which loads matter during an outage, and what the installation site can realistically support.",
    image: "/assets/matken-hero-solar.jpg",
    imageAlt: "Representative residential rooftop solar installation",
    icon: "Sun",
    accent: "solar",
    questions: [
      "Which appliances or circuits must stay powered?",
      "How long do typical outages last?",
      "What does recent electricity usage look like?",
      "Is there suitable roof or ground space?",
    ],
    pathways: [
      "Solar project consultation",
      "Battery-backup planning",
      "Existing-system discussion",
      "Monitoring and energy-use guidance",
    ],
    nextStep:
      "Call the verified number or prepare a private summary. Matken still has to review the property before any system size, quote, or visit.",
  },
  {
    slug: "electrical",
    label: "Electrical",
    shortLabel: "Electrical",
    eyebrow: "Start with a clear, safe scope",
    summary:
      "Describe the property, the issue, and the outcome you need so the right electrical conversation can start quickly.",
    detail:
      "Electrical work should begin with the property context and a precise description of the concern—not assumptions made from a short message.",
    image: "/assets/service-electrical.jpg",
    imageAlt: "Representative electrician testing an electrical panel",
    icon: "Plug",
    accent: "electrical",
    questions: [
      "Is this a new installation, upgrade, or fault?",
      "Is power currently available at the property?",
      "Which rooms, circuits, or equipment are affected?",
      "Is there an urgent safety concern?",
    ],
    pathways: [
      "Residential electrical request",
      "Commercial electrical request",
      "Panel or circuit discussion",
      "New-build coordination",
    ],
    nextStep:
      "Call the verified number or prepare a private summary. Matken still has to review the property before any diagnosis, quote, or visit.",
  },
  {
    slug: "construction",
    label: "Construction",
    shortLabel: "Construction",
    eyebrow: "Coordinate the work before it begins",
    summary:
      "Share the project stage, intended use, drawings if available, and the trades involved so the next step is grounded in the real build.",
    detail:
      "Construction requests benefit from early clarity: what is being built, how far planning has progressed, and where electrical or energy systems fit into the project.",
    image: "/assets/service-construction.jpg",
    imageAlt: "Representative house construction with framing and scaffolding",
    icon: "HardHat",
    accent: "construction",
    questions: [
      "Is this a new build, renovation, or fit-out?",
      "Are drawings or a defined scope available?",
      "Which stage is the project currently in?",
      "Who is coordinating the other trades?",
    ],
    pathways: [
      "New-build project discussion",
      "Renovation planning",
      "Electrical construction coordination",
      "Energy-system integration",
    ],
    nextStep:
      "Call the verified number or prepare a private summary. Matken still has to review drawings and site stage before any coordination plan, quote, or visit.",
  },
];

export const essentialLoadItems = [
  {
    id: "refrigeration",
    label: "Refrigerator or freezer",
    defaultWatts: 200,
    maxQuantity: 3,
    help: "Running value only; compressor start-up demand is not modeled.",
  },
  {
    id: "lighting",
    label: "Essential lighting group",
    defaultWatts: 100,
    maxQuantity: 4,
    help: "Group only the lights you expect to use during an outage.",
  },
  {
    id: "internet",
    label: "Internet equipment",
    defaultWatts: 30,
    maxQuantity: 2,
    help: "Router, modem, or similar connectivity equipment.",
  },
  {
    id: "fans",
    label: "Fan",
    defaultWatts: 75,
    maxQuantity: 6,
    help: "Use the equipment label when available.",
  },
  {
    id: "television",
    label: "Television",
    defaultWatts: 120,
    maxQuantity: 3,
    help: "Display size and technology can change actual demand.",
  },
  {
    id: "device-charging",
    label: "Laptop and device charging",
    defaultWatts: 90,
    maxQuantity: 4,
    help: "A planning group for laptops, phones, and small chargers.",
  },
  {
    id: "water-pump",
    label: "Water pump",
    defaultWatts: 750,
    maxQuantity: 2,
    help: "Motor start-up demand is not modeled.",
  },
  {
    id: "other",
    label: "Other essential equipment",
    defaultWatts: 500,
    maxQuantity: 3,
    help: "Replace the starting watt value with the equipment label value.",
  },
];

export const readinessChecklistByService = {
  solar: [
    {
      id: "recent-usage",
      label: "Recent electricity bills or monthly kWh totals",
    },
    {
      id: "essential-priorities",
      label: "A list of loads that should stay powered",
    },
    {
      id: "site-photos",
      label: "Roof or proposed ground-area photos",
    },
    {
      id: "electrical-photos",
      label: "Panel, meter, or existing energy-equipment photos",
    },
  ],
  electrical: [
    {
      id: "affected-area",
      label: "Affected rooms, circuits, or equipment identified",
    },
    {
      id: "issue-pattern",
      label: "Notes on when the issue occurs and what changes it",
    },
    {
      id: "safe-reference-photos",
      label: "Photos taken without opening covers or approaching exposed parts",
    },
    {
      id: "equipment-labels",
      label: "Model or nameplate details where safely visible",
    },
  ],
  construction: [
    {
      id: "project-stage",
      label: "Current project stage and intended finished use",
    },
    {
      id: "drawings-scope",
      label: "Drawings, sketches, or scope notes if available",
    },
    {
      id: "timing-decisions",
      label: "Preferred timing and important decision dates",
    },
    {
      id: "coordination-contact",
      label: "Trade coordinator or project decision-maker identified",
    },
  ],
};

export const projectCategories = [
  {
    title: "Rooftop solar",
    copy: "Residential and small commercial generation planning.",
    image: "/assets/matken-hero-solar.jpg",
    alt: "Representative rooftop solar panels",
  },
  {
    title: "Electrical systems",
    copy: "Panel, circuit, power-distribution, and upgrade discussions.",
    image: "/assets/service-electrical.jpg",
    alt: "Representative electrical panel work",
  },
  {
    title: "Build coordination",
    copy: "Electrical and energy planning alongside construction work.",
    image: "/assets/service-construction.jpg",
    alt: "Representative construction project",
  },
];

export const processSteps = [
  {
    number: "01",
    title: "Organize the project privately",
    copy: "Use the Blueprint, planner, or request form to capture context. In this preview, those details stay on this device.",
  },
  {
    number: "02",
    title: "Call or share a prepared summary",
    copy: "The verified public number is live. A prepared summary is useful only when you choose to share it.",
  },
  {
    number: "03",
    title: "Matken reviews the real property",
    copy: "Site conditions, load details, and documents still have to be reviewed before any quote, visit, or design.",
  },
  {
    number: "04",
    title: "Confirm the next step separately",
    copy: "Appointments, scope, price, and schedules are confirmed after that conversation—not by submitting a website form.",
  },
];

export const parishes = [
  "Clarendon",
  "Hanover",
  "Kingston",
  "Manchester",
  "Portland",
  "Saint Andrew",
  "Saint Ann",
  "Saint Catherine",
  "Saint Elizabeth",
  "Saint James",
  "Saint Mary",
  "Saint Thomas",
  "Trelawny",
  "Westmoreland",
];

export const resourceArticles = [
  {
    slug: "solar-consultation-checklist",
    category: "Solar planning",
    title: "What to gather before a solar consultation",
    excerpt:
      "Recent electricity usage, essential loads, outage patterns, and property photos make the first conversation more useful.",
    readTime: "4 min",
    sections: [
      {
        heading: "Start with recent energy use",
        body:
          "Bring several recent electricity bills or monthly kWh totals. A single high or low month can hide the property’s normal pattern.",
      },
      {
        heading: "List the loads that matter",
        body:
          "Separate must-run items—such as refrigeration, lighting, connectivity, or pumps—from high-demand loads that may not need battery backup.",
      },
      {
        heading: "Document the property",
        body:
          "Useful photos include the roof or proposed ground area, the electrical panel, meter location, and any existing inverter or generator equipment.",
      },
    ],
  },
  {
    slug: "outage-priority-list",
    category: "Backup planning",
    title: "Build an outage priority list before choosing a battery",
    excerpt:
      "A smaller, carefully chosen essential-load plan can be more useful than trying to power everything without limits.",
    readTime: "5 min",
    sections: [
      {
        heading: "Name the essential circuits",
        body:
          "Write down what must remain available during an outage and how many hours each item is normally used.",
      },
      {
        heading: "Watch start-up demand",
        body:
          "Motors and compressors can need more power when starting than while running. A planning estimate cannot replace equipment-specific review.",
      },
      {
        heading: "Decide how you will manage load",
        body:
          "Backup planning improves when occupants know what should stay off, what can run in turns, and when solar production may help recharge the system.",
      },
    ],
  },
  {
    slug: "electrical-request-photos",
    category: "Electrical",
    title: "Photos that help explain an electrical request",
    excerpt:
      "A wide property view, a clear panel photo, and the affected equipment can reduce ambiguity without attempting remote diagnosis.",
    readTime: "3 min",
    sections: [
      {
        heading: "Show context and detail",
        body:
          "Take one wider image of the area and one close image of the affected equipment. Do not remove covers or touch exposed components for a photo.",
      },
      {
        heading: "Include labels when safely visible",
        body:
          "Equipment nameplates, breaker labels, and model information may help identify what further information is needed.",
      },
      {
        heading: "Treat urgent hazards differently",
        body:
          "Smoke, fire, shock risk, exposed energized parts, or unusual heat should not be handled through a routine website request. Move away from danger and contact the appropriate emergency or utility service.",
      },
    ],
  },
  {
    slug: "construction-scope-starter",
    category: "Construction",
    title: "A simple construction scope starter",
    excerpt:
      "Project stage, intended use, drawings, timing, and trade coordination are the five details worth clarifying first.",
    readTime: "4 min",
    sections: [
      {
        heading: "Describe the finished use",
        body:
          "The same room or building shell can have very different electrical and energy needs depending on how it will be occupied.",
      },
      {
        heading: "State the current project stage",
        body:
          "Concept, drawings, approvals, demolition, rough-in, and finishing each create different planning constraints.",
      },
      {
        heading: "Identify decision owners",
        body:
          "Share who can approve changes and who is coordinating the other trades so questions reach the right person.",
      },
    ],
  },
];

export const faqs = [
  {
    question: "Is the phone number on this website live?",
    answer:
      "Yes. (876) 568-2616 is the verified public number. Planning tools, request forms, invoice lookup, and project tracking stay on this device unless a secure provider is later approved and connected.",
  },
  {
    question: "Does filling in the request form send my details to Matken?",
    answer:
      "Not in this preview. Until a secure same-origin endpoint is approved, the form prepares a private summary on this device. Nothing is emailed, uploaded, stored, or sent to Matken.",
  },
  {
    question: "Can the website give me a final solar-system size?",
    answer:
      "No. The planner produces an educational starting range only. A real recommendation needs property, load, equipment, installation, and budget review.",
  },
  {
    question: "Can I request electrical, solar, and construction help together?",
    answer:
      "Yes. Choose the closest primary service and explain the combined scope in the project details. The request can then be routed for the right follow-up.",
  },
  {
    question: "Does submitting a request confirm an appointment?",
    answer:
      "No. A request starts the conversation. Timing, scope, site access, and any appointment must be confirmed separately.",
  },
  {
    question: "How will online invoice payment work?",
    answer:
      "Customers will use a private payment link from the selected payment provider. The public website will never expose an invoice from an invoice number alone.",
  },
  {
    question: "Are the project photos completed Matken jobs?",
    answer:
      "Not unless a caption explicitly says so. Images in this prototype are representative editorial references pending approved Matken project photography.",
  },
];

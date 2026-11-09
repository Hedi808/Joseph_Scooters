import type { Locale } from "./i18n";
type Editorial = {
  explore: string;
  journey: string;
  mobility: string;
  less: string;
  freedom: string;
  reinvent: string;
  city: string;
  yours: string;
  cityCopy: string;
  compact: string;
  perspective: string;
  further: string;
  pace: string;
  bikeCopy: string;
  guide: string;
  news: string;
  illustration: string;
  guides: [string, string][];
  footer: string;
  info: string;
  space: string;
};
export const editorial: Record<Locale, Editorial> = {
  fr: {
    explore: "EXPLORER",
    journey: "À CHAQUE TRAJET,",
    mobility: "SA MOBILITÉ.",
    less: "MOINS DE ROUTINE.",
    freedom: "PLUS DE LIBERTÉ.",
    reinvent: "LE QUOTIDIEN, RÉINVENTÉ.",
    city: "LA VILLE EST",
    yours: "À VOUS.",
    cityCopy:
      "Un trajet au travail, un détour, une envie de bouger. Trouvez une mobilité adaptée à vos habitudes et à votre environnement.",
    compact: "COMPACTE. PRATIQUE. ÉLECTRIQUE.",
    perspective: "CHANGEZ DE PERSPECTIVE",
    further: "PLUS LOIN.",
    pace: "À VOTRE RYTHME.",
    bikeCopy:
      "Redécouvrez le plaisir du vélo avec l’assistance électrique. Choisissez un cadre, une position et une batterie adaptés à vos trajets.",
    guide: "LE GUIDE",
    news: "ACTUALITÉ BOUTIQUE",
    illustration: "ILLUSTRATION CONCEPTUELLE · NON CONTRACTUELLE",
    guides: [
      [
        "Votre trajet avant tout",
        "Distance, relief et possibilités de rangement : partez de vos besoins réels.",
      ],
      [
        "L’autonomie, sans raccourci",
        "La portée varie avec le poids, la température, le relief et les conditions de conduite.",
      ],
      [
        "Roulez avec attention",
        "Vérifiez les freins et pneus. Utilisez un équipement adapté et respectez les règles locales.",
      ],
    ],
    footer: "Une nouvelle énergie pour vos déplacements.",
    info: "INFORMATIONS",
    space: "VOTRE ESPACE",
  },
  en: {
    explore: "EXPLORE",
    journey: "EVERY JOURNEY,",
    mobility: "YOUR WAY.",
    less: "LESS ROUTINE.",
    freedom: "MORE FREEDOM.",
    reinvent: "EVERYDAY, REIMAGINED.",
    city: "THE CITY IS",
    yours: "YOURS.",
    cityCopy:
      "The commute, a detour, a reason to move. Find electric mobility that fits your habits and surroundings.",
    compact: "COMPACT. PRACTICAL. ELECTRIC.",
    perspective: "CHANGE YOUR PERSPECTIVE",
    further: "GO FURTHER.",
    pace: "AT YOUR OWN PACE.",
    bikeCopy:
      "Rediscover cycling with electric assistance. Choose a frame, riding position and battery suited to your journeys.",
    guide: "THE GUIDE",
    news: "STORE NEWS",
    illustration: "CONCEPT ILLUSTRATION · NOT A PRODUCT PHOTOGRAPH",
    guides: [
      [
        "Start with your journey",
        "Distance, terrain and storage: start with your actual needs.",
      ],
      [
        "Range, with context",
        "Range varies with weight, temperature, terrain and riding conditions.",
      ],
      [
        "Ride with care",
        "Check brakes and tyres. Use suitable equipment and follow local rules.",
      ],
    ],
    footer: "New energy for your everyday journeys.",
    info: "INFORMATION",
    space: "YOUR SPACE",
  },
  ar: {
    explore: "اكتشف",
    journey: "لكل رحلة،",
    mobility: "وسيلة تناسبك.",
    less: "روتين أقل.",
    freedom: "حرية أكثر.",
    reinvent: "يومك برؤية جديدة.",
    city: "المدينة",
    yours: "لك.",
    cityCopy:
      "إلى العمل أو في جولة جديدة. اختر وسيلة تنقل تناسب عاداتك ومحيطك.",
    compact: "مدمجة. عملية. كهربائية.",
    perspective: "غيّر وجهة نظرك",
    further: "اذهب أبعد.",
    pace: "بإيقاعك الخاص.",
    bikeCopy:
      "اكتشف متعة الدراجة بالمساعدة الكهربائية. اختر هيكلاً ووضعية وبطارية تناسب رحلاتك.",
    guide: "الدليل",
    news: "أخبار المتجر",
    illustration: "رسم توضيحي تصوري · ليس صورة منتج",
    guides: [
      [
        "رحلتك أولاً",
        "المسافة والتضاريس والتخزين: انطلق من احتياجاتك الحقيقية.",
      ],
      [
        "مدى البطارية بوضوح",
        "يتغير المدى حسب الوزن والحرارة والتضاريس وظروف القيادة.",
      ],
      [
        "قد بحذر",
        "افحص المكابح والإطارات. استخدم تجهيزات مناسبة واحترم القواعد المحلية.",
      ],
    ],
    footer: "طاقة جديدة لتنقلاتك اليومية.",
    info: "معلومات",
    space: "مساحتك",
  },
};

window.KQ = window.KQ || {};
KQ.KANTONE = [
  {
    "id": "AG",
    "name": "Aargau",
    "hauptort": "Aarau",
    "nachbarn": [
      "BL",
      "BE",
      "SO",
      "LU",
      "ZG",
      "ZH"
    ]
  },
  {
    "id": "AI",
    "name": "Appenzell Innerrhoden",
    "hauptort": "Appenzell",
    "nachbarn": [
      "AR",
      "SG"
    ]
  },
  {
    "id": "AR",
    "name": "Appenzell Ausserrhoden",
    "hauptort": "Herisau",
    "nachbarn": [
      "AI",
      "SG"
    ]
  },
  {
    "id": "BE",
    "name": "Bern",
    "hauptort": "Bern",
    "nachbarn": [
      "AG",
      "SO",
      "LU",
      "OW",
      "NW",
      "UR",
      "VS",
      "VD",
      "FR",
      "NE",
      "JU"
    ]
  },
  {
    "id": "BL",
    "name": "Basel-Landschaft",
    "hauptort": "Liestal",
    "nachbarn": [
      "BS",
      "SO",
      "AG",
      "JU"
    ]
  },
  {
    "id": "BS",
    "name": "Basel-Stadt",
    "hauptort": "Basel",
    "nachbarn": [
      "BL"
    ]
  },
  {
    "id": "FR",
    "name": "Freiburg",
    "hauptort": "Freiburg",
    "nachbarn": [
      "VD",
      "NE",
      "BE"
    ]
  },
  {
    "id": "GE",
    "name": "Genf",
    "hauptort": "Genf",
    "nachbarn": [
      "VD"
    ]
  },
  {
    "id": "GL",
    "name": "Glarus",
    "hauptort": "Glarus",
    "nachbarn": [
      "SG",
      "GR",
      "UR",
      "SZ"
    ]
  },
  {
    "id": "GR",
    "name": "Graubünden",
    "hauptort": "Chur",
    "nachbarn": [
      "SG",
      "GL",
      "UR",
      "TI"
    ]
  },
  {
    "id": "JU",
    "name": "Jura",
    "hauptort": "Delsberg",
    "nachbarn": [
      "BE",
      "SO",
      "BL",
      "NE"
    ]
  },
  {
    "id": "LU",
    "name": "Luzern",
    "hauptort": "Luzern",
    "nachbarn": [
      "AG",
      "ZG",
      "SZ",
      "NW",
      "OW",
      "BE"
    ]
  },
  {
    "id": "NE",
    "name": "Neuenburg",
    "hauptort": "Neuenburg",
    "nachbarn": [
      "VD",
      "FR",
      "BE",
      "JU"
    ]
  },
  {
    "id": "NW",
    "name": "Nidwalden",
    "hauptort": "Stans",
    "nachbarn": [
      "OW",
      "LU",
      "SZ",
      "UR",
      "BE"
    ]
  },
  {
    "id": "OW",
    "name": "Obwalden",
    "hauptort": "Sarnen",
    "nachbarn": [
      "BE",
      "LU",
      "NW",
      "UR"
    ]
  },
  {
    "id": "SG",
    "name": "St. Gallen",
    "hauptort": "St. Gallen",
    "nachbarn": [
      "ZH",
      "SZ",
      "GL",
      "GR",
      "AR",
      "AI",
      "TG"
    ]
  },
  {
    "id": "SH",
    "name": "Schaffhausen",
    "hauptort": "Schaffhausen",
    "nachbarn": [
      "ZH",
      "TG"
    ]
  },
  {
    "id": "SO",
    "name": "Solothurn",
    "hauptort": "Solothurn",
    "nachbarn": [
      "AG",
      "BL",
      "BE",
      "JU"
    ]
  },
  {
    "id": "SZ",
    "name": "Schwyz",
    "hauptort": "Schwyz",
    "nachbarn": [
      "ZH",
      "ZG",
      "LU",
      "NW",
      "UR",
      "GL",
      "SG"
    ]
  },
  {
    "id": "TG",
    "name": "Thurgau",
    "hauptort": "Frauenfeld",
    "nachbarn": [
      "ZH",
      "SH",
      "SG"
    ]
  },
  {
    "id": "TI",
    "name": "Tessin",
    "hauptort": "Bellinzona",
    "nachbarn": [
      "VS",
      "UR",
      "GR"
    ]
  },
  {
    "id": "UR",
    "name": "Uri",
    "hauptort": "Altdorf",
    "nachbarn": [
      "SZ",
      "GL",
      "GR",
      "TI",
      "VS",
      "BE",
      "OW",
      "NW"
    ]
  },
  {
    "id": "VD",
    "name": "Waadt",
    "hauptort": "Lausanne",
    "nachbarn": [
      "GE",
      "VS",
      "BE",
      "FR",
      "NE"
    ]
  },
  {
    "id": "VS",
    "name": "Wallis",
    "hauptort": "Sitten",
    "nachbarn": [
      "VD",
      "BE",
      "UR",
      "TI"
    ]
  },
  {
    "id": "ZG",
    "name": "Zug",
    "hauptort": "Zug",
    "nachbarn": [
      "ZH",
      "AG",
      "LU",
      "SZ"
    ]
  },
  {
    "id": "ZH",
    "name": "Zürich",
    "hauptort": "Zürich",
    "nachbarn": [
      "AG",
      "ZG",
      "SZ",
      "SG",
      "TG",
      "SH"
    ]
  }
];
KQ.CONFIG = {
  erkennen: { title: 'Kanton erkennen', rounds: 9, penalty: 10000, feedback: 1200, icon: '◎', description: 'Erkenne den markierten Kanton an Name, Wappen und Kürzel.' },
  finden: { title: 'Kanton finden', rounds: 9, penalty: 10000, feedback: 1200, icon: '⌖', description: 'Zeige auf der Karte, wo der gesuchte Kanton liegt.' },
  nachbarn: { title: 'Nachbarkantone', rounds: 8, penalty: 5000, feedback: 2500, icon: '▦', description: 'Welche Kantone grenzen aneinander? Wähle die Nachbarn.' },
  blitz: { title: 'Blitz', rounds: 26, penalty: 5000, feedback: 0, icon: 'ϟ', description: 'Finde alle 26 Kantone. Wie schnell schaffst du die ganze Schweiz?' },
  silhouette: { title: 'Kanton ohne Grenzen finden', rounds: 9, penalty: 10000, feedback: 1200, icon: '◎', description: 'Finde den Kanton auf der Schweizer Karte ohne Kantonsgrenzen.' }
};
KQ.byId = Object.fromEntries(KQ.KANTONE.map(k => [k.id, k]));
KQ.shuffle = function (items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
KQ.block = (round, rounds) => Math.min(2, Math.floor(round * 3 / rounds));
KQ.formatTime = function (ms, precise = false) {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const seconds = Math.floor(tenths / 10);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + (precise ? ',' + tenths % 10 : '');
};

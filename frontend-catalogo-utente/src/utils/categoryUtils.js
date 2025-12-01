export const normalizeCategory = (category) => {
  if (!category) return null;

  // Convert to string if it's not
  const catStr = String(category).toLowerCase();

  // Domestico variations
  // IT: Domestico, Casa
  // EN: Domestic, Home, Household, Consumer
  // FR: Domestique, Maison, Particulier
  // DE: Haushalt, Häuslich, Privat, Zuhause, Heim, Wohnen, Verbraucher
  // ES: Doméstico, Casa, Hogar
  if (
    catStr.includes('domestico') ||
    catStr.includes('doméstico') ||
    catStr.includes('domestic') ||
    catStr.includes('domestique') ||
    catStr.includes('haushalt') ||
    catStr.includes('häuslich') ||
    catStr.includes('privat') ||
    catStr.includes('zuhause') ||
    catStr.includes('heim') ||
    catStr.includes('maison') ||
    catStr.includes('particulier') ||
    catStr.includes('casa') ||
    catStr.includes('hogar') ||
    catStr.includes('haus') || // Catch-all for Haus...
    catStr.includes('wohn') || // Catch-all for Wohn...
    catStr.includes('consumer') ||
    catStr.includes('verbraucher') ||
    (catStr.includes('dom') && catStr.includes('stico'))
  ) {
    return 'Domestico';
  }

  // Professional/Industrial variations
  // IT: Professione / Industriale
  // EN: Professional / Industrial
  // FR: Professionnel / Industriel
  // DE: Professionell / Industriell / Gewerblich
  // ES: Profesional / Industrial
  if (
    catStr.includes('industrial') ||
    catStr.includes('industriel') ||
    catStr.includes('industriell') ||
    catStr.includes('profession') ||
    catStr.includes('gewerblich') ||
    catStr.includes('business') ||
    catStr.includes('profi')
  ) {
    return 'Professione';
  }

  return null; // Return null for unmatched categories
};

export const CONTINENTS = [
  { id: 'africa', name: 'Afrika' },
  { id: 'asia', name: 'Asien' },
  { id: 'europe', name: 'Europa' },
  { id: 'north-america', name: 'Nordamerika' },
  { id: 'south-america', name: 'Südamerika' },
  { id: 'oceania', name: 'Ozeanien' },
  { id: 'antarctica', name: 'Antarktis' },
] as const;

export type ContinentId = (typeof CONTINENTS)[number]['id'];

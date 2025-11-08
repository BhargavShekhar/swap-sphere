/**
 * Pseudonym Generator
 * Generates random pseudonyms in format: Adjective + Animal + 2 digits
 * Example: "SwiftOwl92"
 */

const adjectives = [
  'Swift', 'Silent', 'Bright', 'Bold', 'Clever', 'Quick', 'Wise', 'Brave',
  'Calm', 'Eager', 'Gentle', 'Happy', 'Jolly', 'Kind', 'Lively', 'Mighty',
  'Noble', 'Proud', 'Quiet', 'Rapid', 'Sharp', 'Smooth', 'Swift', 'Tough',
  'Vivid', 'Wild', 'Zen', 'Agile', 'Brisk', 'Clever', 'Daring', 'Elegant',
  'Fierce', 'Graceful', 'Humble', 'Intense', 'Jovial', 'Keen', 'Loyal',
  'Mystic', 'Nimble', 'Optimistic', 'Peaceful', 'Radiant', 'Serene', 'Tranquil',
  'Unique', 'Vibrant', 'Witty', 'Xenial', 'Youthful', 'Zealous'
];

const animals = [
  'Fox', 'Owl', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear', 'Hawk',
  'Falcon', 'Raven', 'Dove', 'Swan', 'Deer', 'Elk', 'Stag', 'Puma',
  'Jaguar', 'Lynx', 'Bobcat', 'Cougar', 'Panther', 'Leopard', 'Cheetah',
  'Jaguar', 'Ocelot', 'Serval', 'Caracal', 'Marten', 'Fisher', 'Wolverine',
  'Badger', 'Otter', 'Mink', 'Weasel', 'Stoat', 'Ferret', 'Mongoose',
  'Civet', 'Genet', 'Fossa', 'Binturong', 'Kinkajou', 'Coati', 'Raccoon',
  'RedPanda', 'Panda', 'Koala', 'Sloth', 'Anteater', 'Armadillo', 'Porcupine',
  'Hedgehog', 'Shrew', 'Mole', 'Bat', 'Squirrel', 'Chipmunk', 'Beaver',
  'Marmot', 'PrairieDog', 'Gopher', 'Hamster', 'Gerbil', 'Mouse', 'Rat',
  'Vole', 'Lemming', 'Dormouse', 'JumpingMouse', 'Jerboa', 'KangarooRat',
  'PocketGopher', 'PocketMouse', 'HarvestMouse', 'FieldMouse', 'WoodMouse',
  'HouseMouse', 'BrownRat', 'BlackRat', 'NorwayRat', 'RoofRat', 'CottonRat',
  'RiceRat', 'MarshRat', 'SwampRat', 'WaterRat', 'Muskrat', 'Nutria',
  'Coypu', 'Capybara', 'Paca', 'Agouti', 'Acouchy', 'Paca', 'Agouti',
  'Paca', 'Agouti', 'Paca', 'Agouti', 'Paca', 'Agouti', 'Paca', 'Agouti'
];

/**
 * Generate a random pseudonym
 * Format: Adjective + Animal + 2 digits
 * Example: "SwiftOwl92"
 */
export function generatePseudonym(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]!;
  const animal = animals[Math.floor(Math.random() * animals.length)]!;
  const digits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${adjective}${animal}${digits}`;
}


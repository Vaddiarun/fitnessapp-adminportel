/**
 * Same rule as the backend (src/services/serving.js): base quantity × portion → what to put on the plate.
 *   servingText('3 idlis + 1 bowl sambar', 1.75) → '5 idlis + 2 bowls sambar'
 */
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const COUNTABLE = /^(idli|dosa|roti|chapati|chilla|paratha|egg|slice|piece|bun|pita|flatbread|banana|apple|date|fig|stick|scoop|white|tortilla|taco|wrap|cutlet|puri|appam|uttapam|almond|falafel|biscuit|cracker|toast|chapatti|pesarattu|pancake|kebab|tikki|patty|cheese)(e?s)?$/i;
const METRIC = /^(g|ml|kg|l)$/i;
const PLURALISE = /^(bowl|cup|glass|plate|scoop|slice|stick|piece|serving)$/i;

const parse = (tok: string) => {
  const m = /^(\d+(?:\.\d+)?)?([½¼¾⅓⅔])?$/.exec(tok);
  if (!m || (!m[1] && !m[2])) return null;
  return (m[1] ? Number(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
};
const half = (x: number) => {
  const r = Math.max(0.5, Math.round(x * 2) / 2);
  const whole = Math.floor(r);
  return r % 1 ? `${whole || ''}½` : String(whole);
};
const singular = (w: string) => w.replace(/(chapati|roti|idli|dosa|chilla|paratha|pita|banana|date|fig|stick|slice|piece|bun|egg|white|scoop|almond|cutlet|puri|patty|tortilla|taco|wrap|toast|cracker|biscuit|kebab|tikki|falafel|appam|uttapam|pancake|cheese)(e?s)$/i, '$1');
const plural = (w: string) => (/(s|sh|ch|x)$/i.test(w) ? w + 'es' : w + 's');

export function servingText(q: string, portion = 1) {
  const text = String(q ?? '').trim();
  if (!text || !portion || portion === 1) return text;
  return text.replace(/(\d+(?:\.\d+)?[½¼¾⅓⅔]?|[½¼¾⅓⅔])(\s+)([A-Za-z][\w-]*)/g, (all, num: string, space: string, word: string) => {
    const v = parse(num);
    if (v === null) return all;
    const x = v * portion;
    if (METRIC.test(word)) return `${Math.max(5, Math.round(x / 5) * 5)}${space}${word}`;
    if (COUNTABLE.test(word)) {
      const n = Math.max(1, Math.round(x));
      const base = singular(word);
      return `${n}${space}${n === 1 ? base : base === word ? plural(base) : word}`;
    }
    return `${half(x)}${space}${PLURALISE.test(word) && Math.max(0.5, Math.round(x * 2) / 2) > 1 ? plural(word) : word}`;
  });
}

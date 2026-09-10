/* Keyword-based category SUGGESTION — suggestCategory() (index.html:663-680).

   Advisory only. The original never auto-selects and never auto-saves it: it
   renders a button the user must click, and clicking it only sets the select.
   M5-36. */

/** `CAT_KEYWORDS` — index.html:663-676, verbatim including the leading
    spaces in ' rəf' and ' oil', which make those two match on a word
    boundary rather than inside a longer word. */
export const CAT_KEYWORDS: Record<string, string[]> = {
  'Generatorlar': ['generator', 'jenerator'],
  'Nasoslar': ['nasos', 'pump', 'насос'],
  'Konteynerlər': ['konteyner', 'container'],
  'Xüsusi texnika': ['ekskavator', 'buldozer', 'kran', 'yükləyici', 'pogruzchik'],
  'Kanselyariya və ofis ləvazimatları': ['kağız', 'qələm', 'stapler', 'kanselyariya', 'qovluq', 'marker', 'skrep'],
  'İT və ofis texnikası': ['kompüter', 'komputer', 'noutbuk', 'printer', 'monitor', 'server', 'router', 'switch', 'skaner'],
  'Mebel': ['stol', 'stul', 'kreslo', 'şkaf', 'mebel', ' rəf', 'divan'],
  'Əməyin mühafizəsi və təhlükəsizlik vasitələri': ['dəbilqə', 'əlcək', 'respirator', 'jilet', 'təhlükəsizlik', 'qoruyucu', 'kaska'],
  'Filtrlər': ['filtr', 'filter', 'фильтр'],
  'Yağlar': ['yağ', ' oil', 'масло', 'sürtkü', 'antifriz'],
  'Laboratoriya malları': ['laborator', 'reagent', 'kolba', 'probirka', 'mikroskop'],
  'Alətlər və cihazlar': ['alət', 'cihaz', 'açar', 'çəkic', 'burğu', 'multimetr', 'ölçü cihazı'],
}

/**
 * Suggests a category for an item name, or '' when nothing matches.
 *
 * Two details of the original are load-bearing:
 *
 *  - the loop runs over the CATEGORY LIST, not over the keyword map, so a
 *    category the Admin has hidden can never be suggested, and the directory's
 *    own order decides which of two matching categories wins;
 *  - the name is padded with a space on both sides before matching, which is
 *    what lets ' rəf' and ' oil' match at the start or end of a name.
 */
export function suggestCategory(name: string, categories: string[]): string {
  const n = ' ' + String(name || '').toLowerCase() + ' '
  for (const cat of categories) {
    if ((CAT_KEYWORDS[cat] || []).some((k) => n.indexOf(k) >= 0)) return cat
  }
  return ''
}

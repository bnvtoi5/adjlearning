/**
 * Utility functions for robust answer normalization and matching across all exercise types.
 * Safely handles:
 * - Special characters: . , ! ? ; : " ' ` “ ” ‘ ’ ( ) { } [ ] - – — / \ ~ _ # *
 * - Typographic / smart punctuation from mobile keyboards (smart quotes, smart apostrophes)
 * - Trailing/leading punctuation (e.g. "apple." vs "apple")
 * - Parentheses with optional text (e.g. "(to) go" matches both "to go" and "go")
 * - Slashes and pipes for alternative answers (e.g. "color / colour")
 * - Whitespace and case insensitivity
 */

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032']/g, "'") // Normalize smart apostrophes to '
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"') // Normalize smart quotes to "
    .replace(/[\u2013\u2014\u2212]/g, '-')         // Normalize en/em dashes to -
    .replace(/\u2026/g, '...')                     // Normalize ellipsis … to ...
    .replace(/\u00A0/g, ' ')                       // Non-breaking space to regular space
    .trim();
}

/**
 * Strips punctuation and symbols for pure semantic / token comparison.
 * Keeps letters and digits, but removes punctuation marks that may or may not be typed by students.
 */
export function cleanPunctuation(text: string): string {
  return normalizeText(text)
    .replace(/[.,!?;:()[\]{}'"`“”—–~_#*^&/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all punctuation and spaces down to raw alphanumeric and accented characters.
 */
export function stripToAlphanumeric(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9à-ỹ]/gi, '');
}

/**
 * Checks if a user's answer matches any acceptable target answer.
 */
export function isAnswerMatch(userAnswer: string, targetAnswer: string): boolean {
  if (!userAnswer && !targetAnswer) return true;
  if (!userAnswer || !targetAnswer) return false;

  const rawUser = normalizeText(userAnswer);
  const cleanUser = cleanPunctuation(rawUser);
  const strippedUser = stripToAlphanumeric(rawUser);

  const alternatives = targetAnswer.split(/\s*[/|]\s*/).filter(Boolean);

  return alternatives.some(alt => {
    const rawAlt = normalizeText(alt);
    const cleanAlt = cleanPunctuation(rawAlt);
    const strippedAlt = stripToAlphanumeric(rawAlt);

    if (rawUser === rawAlt) return true;
    if (cleanUser && cleanAlt && cleanUser === cleanAlt) return true;
    if (strippedUser && strippedAlt && strippedUser === strippedAlt) return true;

    if (rawAlt.includes('(') && rawAlt.includes(')')) {
      const withoutParens = cleanPunctuation(rawAlt.replace(/\(.*?\)/g, ' '));
      const withParensContent = cleanPunctuation(rawAlt.replace(/[()]/g, ' '));

      if (withoutParens && cleanUser === withoutParens) return true;
      if (withParensContent && cleanUser === withParensContent) return true;

      const strippedWithout = stripToAlphanumeric(withoutParens);
      const strippedWith = stripToAlphanumeric(withParensContent);
      if (strippedWithout && strippedUser === strippedWithout) return true;
      if (strippedWith && strippedUser === strippedWith) return true;
    }

    if ((rawAlt.includes('{') && rawAlt.includes('}')) || (rawAlt.includes('[') && rawAlt.includes(']'))) {
      const strippedBrackets = cleanPunctuation(rawAlt.replace(/[{}[\]]/g, ' '));
      if (strippedBrackets && cleanUser === strippedBrackets) return true;
      const strippedBracketsAlpha = stripToAlphanumeric(strippedBrackets);
      if (strippedBracketsAlpha && strippedUser === strippedBracketsAlpha) return true;
    }

    return false;
  });
}

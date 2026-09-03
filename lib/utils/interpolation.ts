export interface RecipientData {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  [key: string]: any;
}

/**
 * Interpolates template text with variable mappings and recipient data.
 * Supports:
 * - Meta numeric parameters: {{1}}, {{2}} mapped via variableMapping dictionary
 * - Direct named parameters: {{firstName}}, {{lastName}}, {{phone}}, {{email}}
 */
export function interpolateTemplate(
  templateText: string,
  mapping: Record<string, string> = {},
  recipient: RecipientData = {}
): string {
  if (!templateText) return '';

  let result = templateText;

  // Replace numeric or mapped placeholders {{key}}
  for (const [key, sourceField] of Object.entries(mapping)) {
    const placeholderRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    // Check if sourceField matches a field in recipient
    let value = '';
    if (recipient[sourceField] !== undefined && recipient[sourceField] !== null) {
      value = String(recipient[sourceField]);
    } else {
      // If it is a static literal (e.g. user entered a static date or custom text)
      value = sourceField;
    }
    result = result.replace(placeholderRegex, value);
  }

  // Replace direct named variables if any remain: {{firstName}}, etc.
  result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, paramName) => {
    if (recipient[paramName] !== undefined && recipient[paramName] !== null) {
      return String(recipient[paramName]);
    }
    // Check camelCase / lowercase variations
    const lower = paramName.toLowerCase();
    for (const [k, v] of Object.entries(recipient)) {
      if (k.toLowerCase() === lower && v !== undefined && v !== null) {
        return String(v);
      }
    }
    return match; // keep original if unresolved
  });

  return result;
}

/**
 * Extracts all placeholders from a template string e.g. ["1", "2"] or ["firstName", "eventName"]
 */
export function extractPlaceholders(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
  const unique = Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, ''))));
  return unique;
}

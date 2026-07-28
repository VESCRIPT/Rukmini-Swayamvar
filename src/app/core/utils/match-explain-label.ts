/** One strength or gap row from match explain API. */
export interface MatchExplainLineInput {
  key?: string;
  reason?: string;
  label?: string;
  message?: string;
}

const FIELD_LABELS: Record<string, string> = {
  age: 'Age',
  height: 'Height',
  income: 'Annual income',
  country: 'Country',
  marital_status: 'Marital status',
  religion: 'Religion',
  mother_tongue: 'Mother tongue',
  education: 'Education',
  occupation: 'Occupation',
  caste: 'Caste',
  city: 'City',
  state: 'State',
  diet: 'Diet',
  personality_social: 'Social energy',
  personality: 'Personality',
  lifestyle: 'Lifestyle',
  qualification: 'Qualification'
};

/** Display label for a preference field key (catalog key or API label). */
export function resolveMatchFieldLabel(key?: string, apiLabel?: string): string | null {
  const fromApi = apiLabel?.trim();
  if (fromApi) return fromApi;

  const k = key?.trim();
  if (!k) return null;
  if (FIELD_LABELS[k]) return FIELD_LABELS[k];

  return k
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Full line for UI: "Diet — No option in common with your diet preference"
 */
export function formatMatchExplainLine(item: MatchExplainLineInput): string {
  const field = resolveMatchFieldLabel(item.key, item.label);
  const detail = humanizeMatchReasonDetail(
    String(item.reason ?? item.message ?? '').trim(),
    field
  );

  if (field && detail) {
    return `${field} — ${detail}`;
  }
  return detail || field || '';
}

function humanizeMatchReasonDetail(reason: string, fieldLabel: string | null): string {
  if (!reason) {
    return fieldLabel ? `${fieldLabel} not provided on their profile` : '';
  }

  const lower = reason.toLowerCase();

  if (lower === 'no overlap' || lower.includes('no overlap')) {
    return fieldLabel
      ? `No option in common with your ${fieldLabel.toLowerCase()} preference`
      : 'No option in common with your preference';
  }

  if (lower.includes('candidate field empty') || lower === 'empty' || lower === 'field empty') {
    return fieldLabel
      ? `They have not added ${fieldLabel.toLowerCase()} on their profile yet`
      : 'They have not added this detail yet';
  }

  if (lower.includes('personality') && lower.includes('incomplete')) {
    return 'Personality / social energy not completed on their profile';
  }

  if (lower.includes('profile incomplete') || lower.includes('incomplete')) {
    return fieldLabel
      ? `${fieldLabel} section not completed on their profile`
      : 'Profile section not completed';
  }

  const matched = reason.match(/^matched:\s*(.+)$/i);
  if (matched) {
    const value = matched[1].trim();
    return fieldLabel
      ? `Matches your ${fieldLabel.toLowerCase()} preference (${value})`
      : `Matches your preference (${value})`;
  }

  const within = reason.match(/^within\s+(.+)$/i);
  if (within) {
    return fieldLabel
      ? `Within your ${fieldLabel.toLowerCase()} range (${within[1].trim()})`
      : `Within your preferred range (${within[1].trim()})`;
  }

  const belowMin = reason.match(/^below\s+min\s*\((\d+)\)$/i);
  if (belowMin) {
    const n = Number(belowMin[1]);
    if (fieldLabel === 'Height' || (n < 300 && !fieldLabel)) {
      return `Below your minimum height (${n} cm)`;
    }
    if (fieldLabel === 'Annual income' || n >= 10000) {
      return `Below your minimum income (₹${n.toLocaleString('en-IN')})`;
    }
    return fieldLabel
      ? `Below your minimum ${fieldLabel.toLowerCase()} (${belowMin[1]})`
      : `Below your minimum (${belowMin[1]})`;
  }

  const aboveMax = reason.match(/^above\s+max\s*\((\d+)\)$/i);
  if (aboveMax) {
    const n = Number(aboveMax[1]);
    if (fieldLabel === 'Height' || (n < 300 && !fieldLabel)) {
      return `Above your maximum height (${n} cm)`;
    }
    if (fieldLabel === 'Annual income' || n >= 10000) {
      return `Above your maximum income (₹${n.toLocaleString('en-IN')})`;
    }
    return fieldLabel
      ? `Above your maximum ${fieldLabel.toLowerCase()} (${aboveMax[1]})`
      : `Above your maximum (${aboveMax[1]})`;
  }

  if (/^partial/i.test(reason)) {
    return reason.replace(/^partial:?\s*/i, 'Partial match — ');
  }

  if (fieldLabel && !reason.toLowerCase().startsWith(fieldLabel.toLowerCase())) {
    return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
  }

  return reason.charAt(0).toUpperCase() + reason.slice(1);
}

/** @deprecated Use formatMatchExplainLine */
export function humanizeMatchReason(reason: string): string {
  return humanizeMatchReasonDetail(reason.trim(), null);
}

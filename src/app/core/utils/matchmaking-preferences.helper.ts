import {
  CatalogField,
  MatchmakingPriority,
  PreferenceCriterion,
  SavePreferencesPayload
} from '../../models/matchmaking.models';

/** Shared partner-preference fields for the Partner Preferences page. */
export interface PartnerPrefsFormValues {
  minAge?: number | null;
  maxAge?: number | null;
  fromHeightCm?: number | null;
  toHeightCm?: number | null;
  fromIncome?: number | null;
  toIncome?: number | null;
  country?: string;
  maritalStatus?: string;
  religions?: string[];
  religion?: string;
  occupation?: string;
  education?: string;
  motherTongue?: string;
  caste?: string;
  city?: string;
  state?: string;
  diet?: string[];
  personalitySocial?: string[];
}

export function normalizeMaritalStatusForApi(status: string): string {
  const s = (status || '').trim();
  if (!s || s === 'Any' || s === "Doesn't matter" || s === 'Never Married') {
    return s === 'Never Married' ? 'Single' : s;
  }
  return s;
}

export function applyV2CriteriaToPartnerForm(
  criteria: PreferenceCriterion[],
  target: PartnerPrefsFormValues
): void {
  for (const c of criteria) {
    if (c.key === 'age' && c.values && !Array.isArray(c.values)) {
      target.minAge = c.values.min;
      target.maxAge = c.values.max;
      continue;
    }
    if (c.key === 'height' && c.values && !Array.isArray(c.values)) {
      target.fromHeightCm = c.values.min;
      target.toHeightCm = c.values.max;
      continue;
    }
    if (c.key === 'income' && c.values && !Array.isArray(c.values)) {
      target.fromIncome = c.values.min;
      target.toIncome = c.values.max;
      continue;
    }
    const values = Array.isArray(c.values) ? c.values : [];
    switch (c.key) {
      case 'country':
        target.country = values[0];
        break;
      case 'marital_status':
        target.maritalStatus = values[0];
        break;
      case 'religion':
        target.religions = [...values];
        break;
      case 'mother_tongue':
        target.motherTongue = values[0];
        break;
      case 'education':
        target.education = values[0];
        break;
      case 'occupation':
        target.occupation = values[0];
        break;
      case 'caste':
        target.caste = values[0];
        break;
      case 'city':
        target.city = values[0];
        break;
      case 'state':
        target.state = values[0];
        break;
      case 'diet':
        target.diet = [...values];
        break;
      case 'personality_social':
        target.personalitySocial = [...values];
        break;
    }
  }
}

export function buildV2CriteriaFromPartnerForm(
  form: PartnerPrefsFormValues,
  catalogByKey?: Map<string, CatalogField>
): SavePreferencesPayload['preferences']['criteria'] {
  const out: SavePreferencesPayload['preferences']['criteria'] = [];
  const push = (entry: (typeof out)[number] | null) => {
    if (entry) out.push(entry);
  };

  const fieldMeta = (key: string) => {
    const f = catalogByKey?.get(key);
    return {
      priority: (f?.defaultPriority ?? 'important') as MatchmakingPriority,
      isDealBreaker: f?.defaultDealBreaker ?? false,
      mandatory: f?.defaultMandatory ?? false,
      weight: f?.weight,
      type: f?.type
    };
  };

  if (form.minAge != null && form.maxAge != null) {
    const m = fieldMeta('age');
    push({
      key: 'age',
      values: { min: form.minAge, max: form.maxAge },
      priority: m.priority,
      isDealBreaker: m.isDealBreaker,
      mandatory: m.mandatory,
      weight: m.weight
    });
  }
  if (form.fromHeightCm != null && form.toHeightCm != null) {
    const m = fieldMeta('height');
    push({
      key: 'height',
      values: { min: form.fromHeightCm, max: form.toHeightCm },
      priority: m.priority,
      isDealBreaker: m.isDealBreaker,
      mandatory: m.mandatory,
      weight: m.weight
    });
  }
  if (form.fromIncome != null && form.toIncome != null) {
    const m = fieldMeta('income');
    push({
      key: 'income',
      values: { min: form.fromIncome, max: form.toIncome },
      priority: m.priority,
      isDealBreaker: m.isDealBreaker,
      mandatory: m.mandatory,
      weight: m.weight
    });
  }
  if (form.country) {
    const m = fieldMeta('country');
    push({
      key: 'country',
      values: [form.country],
      priority: m.priority,
      isDealBreaker: m.isDealBreaker,
      mandatory: m.mandatory,
      matchMode: 'any'
    });
  }
  const marital = normalizeMaritalStatusForApi(form.maritalStatus ?? '');
  if (marital && marital !== 'Any' && marital !== "Doesn't matter") {
    const m = fieldMeta('marital_status');
    push({
      key: 'marital_status',
      values: [marital],
      priority: m.priority,
      isDealBreaker: m.isDealBreaker
    });
  }
  const religions = form.religions?.length
    ? form.religions
    : form.religion && form.religion !== 'Any'
      ? [form.religion]
      : [];
  if (religions.length) {
    const m = fieldMeta('religion');
    push({ key: 'religion', values: religions, priority: m.priority, matchMode: 'any' });
  }
  if (form.occupation?.trim()) {
    const m = fieldMeta('occupation');
    push({ key: 'occupation', values: [form.occupation.trim()], priority: m.priority, matchMode: 'any' });
  }
  if (form.education) {
    const m = fieldMeta('education');
    push({ key: 'education', values: [form.education], priority: m.priority, matchMode: 'any' });
  }
  if (form.motherTongue) {
    const m = fieldMeta('mother_tongue');
    push({ key: 'mother_tongue', values: [form.motherTongue], priority: m.priority, matchMode: 'any' });
  }
  if (form.caste?.trim()) {
    const m = fieldMeta('caste');
    push({ key: 'caste', values: [form.caste.trim()], priority: m.priority, matchMode: 'any' });
  }
  if (form.city?.trim()) {
    const m = fieldMeta('city');
    push({ key: 'city', values: [form.city.trim()], priority: m.priority, matchMode: 'any' });
  }
  if (form.state?.trim() && form.state !== 'Any') {
    const m = fieldMeta('state');
    push({ key: 'state', values: [form.state.trim()], priority: m.priority, matchMode: 'any' });
  }
  if (form.diet?.length) {
    const m = fieldMeta('diet');
    push({
      key: 'diet',
      values: [...form.diet],
      priority: m.priority,
      type: 'lifestyle_set'
    });
  }
  if (form.personalitySocial?.length) {
    const m = fieldMeta('personality_social');
    push({
      key: 'personality_social',
      values: [...form.personalitySocial],
      priority: m.priority
    });
  }
  return out;
}

export function hasMinimalPartnerPrefs(criteria: SavePreferencesPayload['preferences']['criteria']): boolean {
  const keys = new Set(criteria.map(c => c.key));
  return keys.has('age') && keys.has('country');
}

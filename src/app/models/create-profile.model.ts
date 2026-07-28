/**
 * POST https://vescript.vescript.com/api/auth/create-profile
 * Request/response shapes from API documentation.
 */
export interface CreateProfileRequest {
  userId: number;
  phone: string;
  fullName: string;
  whoUses: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  height: number;
  weight: number;
  skinTone: string;
  doSmoke: boolean;
  doDrink: boolean;
  diet: string;
  religion: string;
  caste: string;
  subCaste: string;
  city: string;
  state: string;
  country: string;
  address: string;
  profession: string;
  occupation: string;
  education: string;
  workExperience: number;
  income: number;
  companyName: string;
  workLocation: string;
  maritalStatus: string;
  haveChildren: boolean;
  motherTongue: string;
  manglikStatus: string;
  aboutMe: string;
  familyStatus: string;
  familyValues: string;
  familyType: string;
  familyIncome: number;
  motherOccupation: string;
  fatherOccupation: string;
  profilePicture: string;
  bio: string;
}

export interface CreateProfileResponse {
  message: string;
  userId: number;
  user?: Record<string, unknown>;
}

/** Field keys allowed on create-profile (strict whitelist). */
export const CREATE_PROFILE_API_KEYS: ReadonlyArray<keyof CreateProfileRequest> = [
  'userId',
  'phone',
  'fullName',
  'whoUses',
  'gender',
  'dateOfBirth',
  'age',
  'height',
  'weight',
  'skinTone',
  'doSmoke',
  'doDrink',
  'diet',
  'religion',
  'caste',
  'subCaste',
  'city',
  'state',
  'country',
  'address',
  'profession',
  'occupation',
  'education',
  'workExperience',
  'income',
  'companyName',
  'workLocation',
  'maritalStatus',
  'haveChildren',
  'motherTongue',
  'manglikStatus',
  'aboutMe',
  'familyStatus',
  'familyValues',
  'familyType',
  'familyIncome',
  'motherOccupation',
  'fatherOccupation',
  'profilePicture',
  'bio'
];

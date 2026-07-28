import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ViewState } from '../types';
import { ApiService, AuthResponse } from '../services/api.service';
import { CreateProfileRequest, CreateProfileResponse } from '../models/create-profile.model';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';
import { extractHttpErrorMessage } from '../core/utils/extract-http-error-message';

interface ProfileData {
  // Personal Details
  profileFor: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  birthPlace: string;
  birthTime: string;
  birthHours: string;
  birthMinutes: string;
  birthSeconds: string;
  birthTimePeriod: string;
  maritalStatus: string;

  profilePhotos: string[];
  biodata: string | null;
  aboutYourself: string;
  password?: string;
  confirmPassword?: string;

  // Contact Details
  email: string;
  phone: string;
  whatsapp: string;

  // Educational & Professional
  education: string;
  degree: string;
  occupation: string;
  income: string;
  employeeIn: string;
  companyName: string;
  workLocation: string;

  // Physical Attributes
  height: string;
  weight: string;
  bodyType: string;
  complexion: string;

  // Religious Details
  religion: string;
  caste: string;
  subCaste: string;
  panth: string;
  motherTongue: string;
  haveChildren: string;

  // Location
  country: string;
  state: string;
  city: string;
  permanentAddress: string;
  currentAddress: string;
  landmark: string;

  // Family Details
  fatherName: string;
  motherName: string;
  siblings: string;
  familyType: string;
  familyStatus: string;
  familyValues: string[];
  familyIncome: string;
  motherOccupation: string;
  fatherOccupation: string;

  // Horoscope
  rashi: string;
  manglik: string;

  // Interests
  smoke: string;
  drinks: string;
  diet: string;
}

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-form.component.html',
  styleUrls: ['./profile-form.component.css']
})
export class ProfileFormComponent implements OnInit, OnChanges {
  @Input() t!: any;
  @Input() previousView: ViewState = 'home';
  @Input() initialStep: number = 1;
  @Output() viewChange = new EventEmitter<ViewState>();

  currentStep = 1;
  totalSteps = 6;
  showSuccessPopup = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  selectedCountryCode = '+91';
  /** Files selected for upload; indices match profileData.profilePhotos (null = already from server or no file). */
  pendingPhotoFiles: (File | null)[] = [];
  /** Selected marriage profile PDF waiting for upload via multipart endpoint. */
  pendingBiodataFile: File | null = null;
  /** Tracks explicit remove request for existing server-side PDF. */
  removeBiodataRequested = false;
  /** Read-only account fields shown in edit profile (from API userId / user.email). */
  displayProfileId = '';
  displayEmail = '';

  countryCodes = [
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'United States', code: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
    { name: 'Singapore', code: '+65', flag: '🇸🇬' },
    { name: 'New Zealand', code: '+64', flag: '🇳🇿' }
  ];

  profileData: ProfileData = {
    profileFor: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    birthPlace: '',
    birthTime: '',
    birthHours: '10',
    birthMinutes: '00',
    birthSeconds: '00',
    birthTimePeriod: 'AM',
    maritalStatus: '',
    profilePhotos: [],
    biodata: null,
    aboutYourself: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    whatsapp: '',
    education: '',
    degree: '',
    occupation: '',
    income: '',
    employeeIn: '',
    companyName: '',
    workLocation: '',
    height: '150',
    weight: '67',
    bodyType: '',
    complexion: '',
    religion: '',
    caste: '',
    subCaste: '',
    panth: '',
    motherTongue: '',
    haveChildren: '',
    country: 'India',
    state: '',
    city: '',
    permanentAddress: '',
    currentAddress: '',
    landmark: '',
    fatherName: '',
    motherName: '',
    siblings: '',
    familyType: '',
    familyStatus: '',
    familyValues: [],
    familyIncome: '',
    motherOccupation: '',
    fatherOccupation: '',
    rashi: '',
    manglik: '',
    smoke: '',
    drinks: '',
    diet: ''
  };
  isSameAddress = false;

  onSameAddressToggle() {
    if (this.isSameAddress) {
      this.syncPermanentAddress();
    }
  }

  syncPermanentAddress() {
    if (this.isSameAddress) {
      this.profileData.permanentAddress = this.profileData.currentAddress;
    }
  }


  profileForOptions = ['Self', 'Son', 'Daughter', 'Brother', 'Sister', 'Friend', 'Relative'];
  genderOptions = ['Male', 'Female'];
  maritalStatusOptions = ['Single', 'Married', 'Divorced', 'Separated', 'Widowed'];
  educationOptions = ['Graduate', 'Post Graduate', 'PhD', 'Professional Courses', 'Diploma', 'Other'];
  
  degreeOptionsMap: { [key: string]: string[] } = {
    'Graduate': ['B.A.', 'B.Sc.', 'B.Com.', 'B.E.', 'B.Tech.', 'BBA', 'BCA', 'MBBS', 'BDS', 'Other'],
    'Post Graduate': ['M.A.', 'M.Sc.', 'M.Com.', 'M.E.', 'M.Tech.', 'MBA', 'MCA', 'MD', 'MS', 'Other'],
    'PhD': ['Ph.D.', 'D.Phil.', 'D.Sc.', 'D.Litt.', 'Other PhD'],
    'Professional Courses': ['CA', 'CS', 'CMA / ICWA', 'CFA', 'LLB / LLM', 'Professional Course', 'Other'],
    'Diploma': ['Polytechnic', 'ITI', 'Other Diploma'],
    'Other': ['Other']
  };

  bodyTypeOptions = ['Slim', 'Average', 'Athletic', 'Heavy'];
  complexionOptions = ['Fair', 'Medium', 'Dark', 'Very Fair', 'Wheatish'];
  religionOptions = ['Hinduism', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'];

  familyTypeOptions = ['Joint Family', 'Nuclear Family', 'Extended Family', 'Other'];
  familyStatusOptions = ['Rich / Affluence', 'Upper Middle Class', 'Middle Class'];
  familyIncomeOptions = ['Less than 1 Lakh', '1 Lakh - 2 Lakh', '2 Lakh - 5 Lakh', '5 Lakh - 10 Lakh', '10 Lakh - 20 Lakh', '20 Lakh - 50 Lakh', 'More than 50 Lakh'];
  familyValuesOptions = ['Conservatives', 'Spiritual', 'Traditional', 'Open Minded', 'Modern', 'Practical', 'Strict', 'Progressive'];
  residentialStatusOptions = ['Citizen', 'Permanent Resident', 'Work Visa', 'Student Visa'];
  manglikOptions = ['Manglik', 'Non-Manglik', 'Anshik/Partial Manglik', 'Don\'t Know'];

  countryOptions = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore', 'New Zealand', 'Other'];

  // Country → States mapping
  countryStateMap: { [country: string]: string[] } = {
    'India': [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
      'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal', 'Other'
    ],
    'United States': [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming', 'Other'
    ],
    'United Kingdom': [
      'England', 'Scotland', 'Wales', 'Northern Ireland', 'Other'
    ],
    'Canada': [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
      'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
      'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
      'Saskatchewan', 'Yukon', 'Other'
    ],
    'Australia': [
      'Australian Capital Territory', 'New South Wales', 'Northern Territory',
      'Queensland', 'South Australia', 'Tasmania', 'Victoria',
      'Western Australia', 'Other'
    ],
    'United Arab Emirates': [
      'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah',
      'Sharjah', 'Umm Al Quwain', 'Other'
    ],
    'Singapore': [
      'Central Region', 'East Region', 'North Region', 'North-East Region',
      'West Region', 'Other'
    ],
    'New Zealand': [
      'Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay",
      'Manawatu-Whanganui', 'Marlborough', 'Nelson', 'Northland', 'Otago',
      'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington',
      'West Coast', 'Other'
    ],
    'Other': ['Other']
  };

  // State → Cities mapping (all countries)
  stateCityMap: { [state: string]: string[] } = {
    // India
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Chittoor', 'Other'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Pasighat', 'Ziro', 'Bomdila', 'Tezu', 'Roing', 'Aalo', 'Namsai', 'Other'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur', 'Tinsukia', 'Nagaon', 'Diphu', 'Karimganj', 'Sivasagar', 'Other'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Other'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Durg', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Other'],
    'Delhi': ['New Delhi', 'Old Delhi', 'Dwarka', 'Noida', 'Gurgaon', 'Rohini', 'Janakpuri', 'Laxmi Nagar', 'Other'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Other'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Morbi', 'Bharuch', 'Mehsana', 'Other'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Rohtak', 'Karnal', 'Sonipat', 'Yamunanagar', 'Bhiwani', 'Other'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali', 'Bilaspur', 'Hamirpur', 'Una', 'Other'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Other'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Davanagere', 'Ballari', 'Shivamogga', 'Tumakuru', 'Kalaburagi', 'Other'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Kannur', 'Palakkad', 'Malappuram', 'Other'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Satna', 'Rewa', 'Chhindwara', 'Other'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Sangli', 'Satara', 'Other'],
    'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Other'],
    'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Baghmara', 'Other'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Other'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Other'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur', 'Berhampur', 'Balasore', 'Puri', 'Other'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Other'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bharatpur', 'Sikar', 'Other'],
    'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Other'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Other'],
    'Telangana': ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Other'],
    'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Other'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Ghaziabad', 'Noida', 'Aligarh', 'Bareilly', 'Gorakhpur', 'Other'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Other'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Malda', 'Bardhaman', 'Other'],
    // US States
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose', 'Fresno', 'Oakland', 'Long Beach', 'Other'],
    'Texas': ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Other'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Other'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Tallahassee', 'Fort Lauderdale', 'Other'],
    'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria', 'Other'],
    'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Other'],
    'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Other'],
    'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Other'],
    'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Other'],
    'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Other'],
    'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Woodbridge', 'Other'],
    'Virginia': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Other'],
    'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kirkland', 'Other'],
    'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Tempe', 'Gilbert', 'Other'],
    'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Other'],
    'Tennessee': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Other'],
    'Indiana': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Other'],
    'Missouri': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Other'],
    'Maryland': ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Other'],
    'Wisconsin': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Other'],
    'Colorado': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Other'],
    'Minnesota': ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Other'],
    'South Carolina': ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Other'],
    'Alabama': ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Other'],
    'Louisiana': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Other'],
    'Kentucky': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Other'],
    'Oregon': ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Other'],
    'Oklahoma': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Other'],
    'Connecticut': ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Other'],
    'Utah': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Other'],
    'Iowa': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Other'],
    'Nevada': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Other'],
    'Arkansas': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Other'],
    'Mississippi': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Other'],
    'Kansas': ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe', 'Other'],
    'New Mexico': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Other'],
    'Nebraska': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Other'],
    'West Virginia': ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling', 'Other'],
    'Idaho': ['Boise', 'Nampa', 'Meridian', 'Idaho Falls', 'Pocatello', 'Other'],
    'Hawaii': ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Other'],
    'New Hampshire': ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Other'],
    'Maine': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Other'],
    'Montana': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Other'],
    'Rhode Island': ['Providence', 'Cranston', 'Warwick', 'Pawtucket', 'East Providence', 'Other'],
    'Delaware': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Other'],
    'South Dakota': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Other'],
    'North Dakota': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Other'],
    'Alaska': ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Other'],
    'Vermont': ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier', 'Other'],
    'Wyoming': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Other'],
    // UK
    'England': ['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 'Bristol', 'Leicester', 'Coventry', 'Bradford', 'Nottingham', 'Other'],
    'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness', 'Perth', 'Stirling', 'Other'],
    'Wales': ['Cardiff', 'Swansea', 'Newport', 'Bangor', 'Wrexham', 'Other'],
    'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Armagh', 'Newry', 'Other'],
    // Canada
    'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'Brampton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Other'],
    'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna', 'Abbotsford', 'Coquitlam', 'Victoria', 'Other'],
    'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Saguenay', 'Other'],
    'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'St. Albert', 'Other'],
    'Manitoba': ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Other'],
    'Saskatchewan': ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Other'],
    'Nova Scotia': ['Halifax', 'Sydney', 'Truro', 'New Glasgow', 'Other'],
    'New Brunswick': ['Moncton', 'Saint John', 'Fredericton', 'Dieppe', 'Other'],
    'Newfoundland and Labrador': ["St. John's", 'Mount Pearl', 'Corner Brook', 'Conception Bay South', 'Other'],
    'Prince Edward Island': ['Charlottetown', 'Summerside', 'Other'],
    'Northwest Territories': ['Yellowknife', 'Hay River', 'Inuvik', 'Other'],
    'Nunavut': ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Other'],
    'Yukon': ['Whitehorse', 'Dawson City', 'Watson Lake', 'Other'],
    // Australia
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Maitland', 'Coffs Harbour', 'Wagga Wagga', 'Other'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Mildura', 'Other'],
    'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns', 'Toowoomba', 'Other'],
    'Western Australia': ['Perth', 'Mandurah', 'Bunbury', 'Geraldton', 'Kalgoorlie', 'Other'],
    'South Australia': ['Adelaide', 'Mount Gambier', 'Whyalla', 'Murray Bridge', 'Other'],
    'Tasmania': ['Hobart', 'Launceston', 'Devonport', 'Burnie', 'Other'],
    'Australian Capital Territory': ['Canberra', 'Queanbeyan', 'Other'],
    'Northern Territory': ['Darwin', 'Alice Springs', 'Palmerston', 'Other'],
    // UAE
    'Dubai': ['Dubai City', 'Deira', 'Bur Dubai', 'Jumeirah', 'Palm Jumeirah', 'Business Bay', 'Downtown Dubai', 'Other'],
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Khalifa City', 'Mohammed Bin Zayed City', 'Other'],
    'Sharjah': ['Sharjah City', 'Khor Fakkan', 'Kalba', 'Other'],
    'Ajman': ['Ajman City', 'Other'],
    'Fujairah': ['Fujairah City', 'Dibba Al Fujairah', 'Other'],
    'Ras Al Khaimah': ['Ras Al Khaimah City', 'Al Jazirah Al Hamra', 'Other'],
    'Umm Al Quwain': ['Umm Al Quwain City', 'Other'],
    // Singapore
    'Central Region': ['Bishan', 'Bukit Merah', 'Bukit Timah', 'Downtown Core', 'Geylang', 'Kallang', 'Marine Parade', 'Museum', 'Newton', 'Novena', 'Orchard', 'Outram', 'Queenstown', 'River Valley', 'Rochor', 'Singapore River', 'Southern Islands', 'Straits View', 'Toa Payoh', 'Other'],
    'East Region': ['Bedok', 'Changi', 'Pasir Ris', 'Paya Lebar', 'Tampines', 'Other'],
    'North Region': ['Mandai', 'Sembawang', 'Simpang', 'Sungei Kadut', 'Woodlands', 'Yishun', 'Other'],
    'North-East Region': ['Ang Mo Kio', 'Hougang', 'Punggol', 'Sengkang', 'Serangoon', 'Other'],
    'West Region': ['Boon Lay', 'Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Clementi', 'Jurong East', 'Jurong West', 'Pioneer', 'Tengah', 'Tuas', 'Western Islands', 'Western Water Catchment', 'Other'],
    // New Zealand
    'Auckland': ['Auckland City', 'North Shore', 'Waitakere', 'Manukau', 'Papakura', 'Franklin', 'Other'],
    'Wellington': ['Wellington City', 'Lower Hutt', 'Upper Hutt', 'Porirua', 'Other'],
    'Canterbury': ['Christchurch', 'Timaru', 'Selwyn', 'Waimakariri', 'Other'],
    'Waikato': ['Hamilton', 'Thames', 'Taupo', 'Matamata-Piako', 'Other'],
    'Bay of Plenty': ['Tauranga', 'Rotorua', 'Whakatane', 'Kawerau', 'Other'],
    'Otago': ['Dunedin', 'Queenstown', 'Central Otago', 'Clutha', 'Other'],
    'Manawatu-Whanganui': ['Palmerston North', 'Whanganui', 'Manawatu', 'Other'],
    'Northland': ['Whangarei', 'Far North', 'Kaipara', 'Other'],
    "Hawke's Bay": ['Napier', 'Hastings', 'Central Hawke\'s Bay', 'Wairoa', 'Other'],
    'Taranaki': ['New Plymouth', 'Stratford', 'South Taranaki', 'Other'],
    'Marlborough': ['Marlborough', 'Other'],
    'Nelson': ['Nelson City', 'Other'],
    'Tasman': ['Tasman District', 'Other'],
    'Southland': ['Invercargill', 'Gore', 'Fiordland', 'Southland', 'Other'],
    'West Coast': ['Buller', 'Grey', 'Westland', 'Other'],
    'Gisborne': ['Gisborne', 'Other'],
    // Generic fallback
    'Other': ['Other']
  };

  // Keep for backward compat - used internally
  get indianStates(): string[] {
    return this.countryStateMap['India'] || [];
  }

  getAvailableStates(): string[] {
    const country = this.profileData.country;
    return (country && this.countryStateMap[country]) ? this.countryStateMap[country] : [];
  }

  getAvailableCities(): string[] {
    const selectedState = this.profileData.state;
    if (selectedState && this.stateCityMap[selectedState]) {
      return this.stateCityMap[selectedState];
    }
    return [];
  }

  onCountryChange() {
    this.profileData.state = '';
    this.profileData.city = '';

    // Automatically update country code if possible
    const match = this.countryCodes.find(c => c.name === this.profileData.country);
    if (match) {
      this.selectedCountryCode = match.code;
    }
  }

  onEducationChange() {
    this.profileData.degree = '';
  }

  onDobChange() {
    const dobValue = this.profileData.dateOfBirth;
    if (!dobValue) {
      this.profileData.age = '';
      return;
    }
    const dob = new Date(dobValue);
    if (isNaN(dob.getTime())) {
      this.profileData.age = '';
      return;
    }

    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      // Get the last day of the previous month
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    this.profileData.age = `${years} year ${months} month ${days} days`;
  }

  onStateChange() {
    this.profileData.city = '';
  }

  toggleFamilyValue(value: string) {
    const index = this.profileData.familyValues.indexOf(value);
    if (index === -1) {
      this.profileData.familyValues.push(value);
    } else {
      this.profileData.familyValues.splice(index, 1);
    }
  }

  isFamilyValueSelected(value: string): boolean {
    return this.profileData.familyValues.includes(value);
  }

  rashis = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  nakshatras = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni'];

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.initialStep) {
      this.currentStep = Math.min(Math.max(1, this.initialStep), this.totalSteps);
    }

    if (this.previousView === 'edit-profile') {
      this.loadExistingProfileData();
      return;
    }

    // New registration: empty form only (do not load cache or API profile from a prior session)
    const signupEmail = (
      sessionStorage.getItem('signup_email') ||
      localStorage.getItem('signup_email') ||
      ''
    ).trim();
    if (signupEmail) {
      this.profileData.email = signupEmail;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previousView'] && this.previousView === 'edit-profile') {
      this.loadExistingProfileData();
    }
    if (changes['initialStep'] && this.initialStep) {
      this.currentStep = Math.min(Math.max(1, this.initialStep), this.totalSteps);
    }
  }

  onFileSelect(event: any, index?: number) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size should be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      if (index !== undefined && index < 6) {
        // Set photo at specific slot; use new array reference so the view updates
        const next = [...this.profileData.profilePhotos];
        if (next.length <= index) next.length = index + 1;
        next[index] = dataUrl;
        this.profileData.profilePhotos = next;
        while (this.pendingPhotoFiles.length <= index) this.pendingPhotoFiles.push(null);
        this.pendingPhotoFiles[index] = file;
      } else if (this.profileData.profilePhotos.length < 6) {
        this.profileData.profilePhotos = [...this.profileData.profilePhotos, dataUrl];
        this.pendingPhotoFiles = [...this.pendingPhotoFiles, file];
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  onBiodataSelect(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (file.size <= 10 * 1024 * 1024) { // 10MB limit
        this.pendingBiodataFile = file;
        this.removeBiodataRequested = false;
        // Keep a lightweight marker for UI state; actual upload is multipart.
        this.profileData.biodata = file.name;
      } else {
        alert('PDF size should be less than 10MB');
      }
    } else {
      alert('Please select a PDF file');
    }
    // Allow selecting the same file again (replaces still trigger change)
    event.target.value = '';
  }

  removeBiodata() {
    this.profileData.biodata = null;
    this.pendingBiodataFile = null;
    this.removeBiodataRequested = true;
  }

  removePhoto(index: number) {
    this.profileData.profilePhotos = this.profileData.profilePhotos.filter((_, i) => i !== index);
    if (index < this.pendingPhotoFiles.length) {
      this.pendingPhotoFiles = this.pendingPhotoFiles.filter((_, i) => i !== index);
    }
    this.cdr.detectChanges();
  }

  canProceedStep1(): boolean {
    return true; // Photos are now optional
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      window.scrollTo(0, 0);
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0);
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps && this.currentStep !== step) {
      this.currentStep = step;
      window.scrollTo(0, 0);
    }
  }

  submitProfile() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = null;
    const isEditMode = this.previousView === 'edit-profile';

    if (isEditMode) {
      const payload = this.buildCreateProfilePayload(true);
      if (!this.apiService.isAuthenticated()) {
        this.isSubmitting = false;
        this.errorMessage = 'Please log in again to update your profile.';
        return;
      }
      const userId = this.resolveUserId();
      if (!userId) {
        this.isSubmitting = false;
        this.errorMessage = 'User ID not found. Please login again.';
        return;
      }
      const validationError = this.validateEditProfilePayload(payload);
      if (validationError) {
        this.isSubmitting = false;
        this.errorMessage = validationError;
        return;
      }
      const filesToUpload = this.pendingPhotoFiles.filter((f): f is File => f instanceof File);
      if (filesToUpload.length === 0) {
        this.doEditProfile(userId, payload);
        return;
      }
      forkJoin(filesToUpload.map((file) => this.apiService.uploadProfilePhoto(userId, file))).subscribe({
        next: () => {
          this.pendingPhotoFiles = this.pendingPhotoFiles.map(() => null);
          this.doEditProfile(userId, payload);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.errorMessage = extractHttpErrorMessage(err, 'Failed to upload photo(s). Please try again.');
          console.error('Profile photo upload error:', err);
        }
      });
    } else {
      this.runCreateProfileFlow();
    }
  }

  private doEditProfile(userId: string, payload: any) {
    const editPayload = this.finalizePayloadForApi({ ...payload, userId }, 'edit');
    this.apiService.editMyProfile(editPayload).subscribe({
      next: (response: any) => {
        const isFailure =
          response?.success === false ||
          response?.status === 'error' ||
          response?.status === 'failed';
        if (isFailure) {
          this.isSubmitting = false;
          this.errorMessage =
            response?.message || response?.error || 'Failed to update profile. Please try again.';
          console.error('Edit profile rejected:', response);
          return;
        }
        const isSuccess = response?.success === true || response?.status === 'success' || !!response?.message;
        if (isSuccess) {
          const updatedData = response?.data?.profile || response?.data?.user || response?.profile || response?.user || response?.data || null;
          if (updatedData) {
            localStorage.setItem('my_profile_data', JSON.stringify(updatedData));
          }
          this.syncPdfAfterProfileSave(userId, (softError?: string) => {
            this.isSubmitting = false;
            this.errorMessage = softError || null;
            this.showSuccessPopup = true;
          });
        } else {
          this.isSubmitting = false;
          this.errorMessage = response?.message || 'Failed to update profile. Please try again.';
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.errorMessage = extractHttpErrorMessage(
          error,
          'An error occurred while updating your profile. Please try again.'
        );
        console.error('Edit profile error:', error, 'Payload:', editPayload);
      }
    });
  }

  private runCreateProfileFlow() {
    const signupEmail =
      (sessionStorage.getItem('signup_email') || localStorage.getItem('signup_email') || '').trim() ||
      this.getStoredUser()?.email ||
      '';

    if (!signupEmail) {
      this.isSubmitting = false;
      this.errorMessage = 'Email not found in session. Please start registration again.';
      return;
    }

    const password = this.profileData.password || '';
    const confirmPassword = this.profileData.confirmPassword || '';

    if (!password || !confirmPassword) {
      this.isSubmitting = false;
      this.errorMessage = 'Please enter and confirm your password before creating profile.';
      return;
    }
    if (password !== confirmPassword) {
      this.isSubmitting = false;
      this.errorMessage = 'Password and Confirm Password must be same.';
      return;
    }
    if (password.length < 6) {
      this.isSubmitting = false;
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    this.apiService
      .setPassword({
        email: signupEmail,
        password,
        confirmPassword
      })
      .subscribe({
        next: (setPwdResponse) => {
          const pwdSuccess =
            setPwdResponse?.success === true || setPwdResponse?.status === 'success';
          if (!pwdSuccess) {
            this.isSubmitting = false;
            this.errorMessage =
              setPwdResponse?.message || 'Failed to set password. Please try again.';
            return;
          }

          sessionStorage.setItem('signup_password', password);
          sessionStorage.setItem('onboarding_after_signup', '1');

          const userIdFromAuth = this.extractUserIdFromAuthResponse(setPwdResponse) || this.resolveUserId();
          if (!userIdFromAuth) {
            this.isSubmitting = false;
            this.errorMessage =
              'Account could not be linked after setting password. Please log in or restart registration from the beginning.';
            return;
          }

          this.submitCreateProfileApi(userIdFromAuth);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = extractHttpErrorMessage(
            error,
            'An error occurred while setting your password. Please try again.'
          );
          console.error('Set password during create-profile error:', error);
        }
      });
  }

  private submitCreateProfileApi(userId: string | number): void {
          const validationError = this.validateCreateProfileApiBody(userId);
          if (validationError) {
            this.isSubmitting = false;
            this.errorMessage = validationError;
            return;
          }

          const createPayload = this.buildCreateProfileApiBody(userId);
          console.log('Create profile API payload:', createPayload);

          this.apiService.createProfile(createPayload).subscribe({
            next: (response) => {
              const res = response as AuthResponse & CreateProfileResponse & {
                error?: string;
              };
              const responseMessage = String(res?.message ?? '').toLowerCase();
              const isFailure =
                res?.success === false ||
                res?.status === 'error' ||
                res?.status === 'failed' ||
                responseMessage.includes('error creating') ||
                responseMessage.includes('validation error');
              if (isFailure) {
                this.isSubmitting = false;
                this.errorMessage =
                  res?.message || res?.error || 'Failed to create profile. Please try again.';
                console.error('Create profile rejected:', res);
                return;
              }
              const isSuccess =
                res?.success === true ||
                res?.status === 'success' ||
                res?.userId != null ||
                res?.user != null ||
                responseMessage.includes('success');
              if (!isSuccess) {
                this.isSubmitting = false;
                this.errorMessage =
                  response?.message || 'Failed to create profile. Please try again.';
                console.error('Create profile failed:', response);
                return;
              }
              const fullName = `${this.profileData.firstName} ${this.profileData.lastName}`.trim();
              this.persistUserIdForNextFlow(response, this.profileData.firstName, fullName);
              this.applyAccountIdentityFromResponse(response);
              if (response?.user && typeof response.user === 'object') {
                this.apiService.setUser({ ...this.getStoredUser(), ...response.user });
                localStorage.setItem('my_profile_data', JSON.stringify(response.user));
              }
              const userId = this.resolveUserId();
              const filesToUpload = this.pendingPhotoFiles.filter((f): f is File => f instanceof File);

              const finalizeWithOptionalPdf = () => {
                if (!userId || !this.pendingBiodataFile) {
                  this.finishCreateProfileSuccess();
                  return;
                }
                const file = this.pendingBiodataFile;
                this.uploadPdfWithReplace(
                  userId,
                  file,
                  (uploadRes: any) => {
                    this.pendingBiodataFile = null;
                    this.removeBiodataRequested = false;
                    const pdfRef = this.extractPdfReferenceFromResponse(uploadRes);
                    if (pdfRef) {
                      this.profileData.biodata = pdfRef;
                    }
                    this.finishCreateProfileSuccess();
                  },
                  (err: any) => {
                    this.isSubmitting = false;
                    const backendMsg = err?.error?.message || err?.error?.error || err?.message;
                    this.errorMessage = `Profile created but marriage profile PDF could not be saved.${backendMsg ? ' Reason: ' + backendMsg : ''} You can upload it later from Marriage Profile section.`;
                    this.finishCreateProfileSuccess();
                  }
                );
              };

              if (!userId || filesToUpload.length === 0) {
                finalizeWithOptionalPdf();
                return;
              }

              forkJoin(filesToUpload.map((file) => this.apiService.uploadProfilePhoto(userId, file))).subscribe({
                next: () => {
                  this.pendingPhotoFiles = this.pendingPhotoFiles.map(() => null);
                  finalizeWithOptionalPdf();
                },
                error: (err: any) => {
                  this.isSubmitting = false;
                  this.errorMessage = err?.error?.message || 'Profile created but photo upload failed.';
                  this.finishCreateProfileSuccess();
                }
              });
            },
            error: (error) => {
              this.isSubmitting = false;
              this.errorMessage = extractHttpErrorMessage(
                error,
                'An error occurred while creating your profile. Please try again.'
              );
              console.error('Create profile error:', error, 'Payload:', createPayload);
            }
          });
  }

  private resolveUserId(): string | null {
    const user = this.getStoredUser();
    const authId = user?.id ?? user?.userId ?? user?._id;
    if (authId != null && String(authId).trim() !== '') {
      return String(authId);
    }
    const profileUserId = localStorage.getItem('profile_user_id');
    return profileUserId?.trim() ? profileUserId.trim() : null;
  }

  private validateEditProfilePayload(payload: Record<string, unknown>): string | null {
    const fullName = String(payload['fullName'] ?? '').trim();
    if (!fullName) {
      return 'Please enter your first and last name before saving.';
    }
    if (!payload['gender']) {
      return 'Please select your gender before saving.';
    }
    if (!payload['dateOfBirth']) {
      return 'Please enter your date of birth before saving.';
    }
    return null;
  }

  private persistUserIdForNextFlow(response: any, firstName?: string, fullName?: string): void {
    const responseUserId =
      response?.data?.userId ||
      response?.data?.id ||
      response?.data?.profile?.userId ||
      response?.profile?.userId ||
      response?.user?.id ||
      response?.user?.userId;

    const storedUser = this.getStoredUser() || {};
    const fallbackUserId = storedUser.id || storedUser.userId || storedUser._id;
    const resolvedUserId = responseUserId || fallbackUserId;

    if (!resolvedUserId) {
      return;
    }

    const apiUser = response?.user && typeof response.user === 'object' ? response.user : null;
    const normalizedUser: any = {
      ...storedUser,
      ...(apiUser || {}),
      id: storedUser.id || apiUser?.id || resolvedUserId,
      userId: storedUser.userId || apiUser?.userId || resolvedUserId
    };
    if (firstName != null && firstName !== '') {
      normalizedUser.firstName = firstName;
    }
    if (fullName != null && fullName !== '') {
      normalizedUser.name = fullName;
    }

    this.apiService.setUser(normalizedUser);
    localStorage.setItem('profile_user_id', String(resolvedUserId));
  }

  private finishCreateProfileSuccess(): void {
    this.isSubmitting = false;
    this.errorMessage = null;
    if (this.isSignupOnboardingFlow()) {
      sessionStorage.setItem('pending_login_after_signup', '1');
      sessionStorage.removeItem('signup_password');
      this.apiService.logout({ preserveSignupEmail: true });
      this.showSuccessPopup = true;
      return;
    }
    this.showSuccessPopup = true;
  }

  isSignupOnboardingFlow(): boolean {
    return (
      this.previousView === 'email-otp' ||
      this.previousView === 'register' ||
      sessionStorage.getItem('onboarding_after_signup') === '1'
    );
  }

  closeSuccessPopup() {
    this.showSuccessPopup = false;
  }

  goToLogin() {
    this.showSuccessPopup = false;
    sessionStorage.setItem('pending_login_after_signup', '1');
    sessionStorage.removeItem('signup_password');
    this.apiService.logout({ preserveSignupEmail: true });
    this.viewChange.emit('login');
  }

  goToDashboard() {
    this.showSuccessPopup = false;
    this.apiService.ensureSessionAuth().subscribe({
      next: (ok) => {
        if (ok || this.apiService.isAuthenticated()) {
          this.viewChange.emit('dashboard');
        } else {
          this.viewChange.emit('login');
        }
      },
      error: () => this.viewChange.emit('login')
    });
  }

  getProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getFieldLabel(baseLabel: string): string {
    const profileFor = this.profileData.profileFor.toLowerCase();

    if (!profileFor || profileFor === 'self') {
      return baseLabel;
    }

    // Map base labels to relationship-specific labels
    const labelMap: { [key: string]: { [key: string]: string } } = {
      'First Name': {
        'son': "Your son's name",
        'daughter': "Your daughter's name",
        'brother': "Your brother's name",
        'sister': "Your sister's name",
        'friend': "Your friend's name",
        'relative': "Your relative's name"
      },
      'Last Name': {
        'son': "Your son's last name",
        'daughter': "Your daughter's last name",
        'brother': "Your brother's last name",
        'sister': "Your sister's last name",
        'friend': "Your friend's last name",
        'relative': "Your relative's last name"
      },
      'Date of Birth': {
        'son': "Your son's date of birth",
        'daughter': "Your daughter's date of birth",
        'brother': "Your brother's date of birth",
        'sister': "Your sister's date of birth",
        'friend': "Your friend's date of birth",
        'relative': "Your relative's date of birth"
      },
      'Gender': {
        'son': "Your son's gender",
        'daughter': "Your daughter's gender",
        'brother': "Your brother's gender",
        'sister': "Your sister's gender",
        'friend': "Your friend's gender",
        'relative': "Your relative's gender"
      },
      'Marital Status': {
        'son': "Your son's marital status",
        'daughter': "Your daughter's marital status",
        'brother': "Your brother's marital status",
        'sister': "Your sister's marital status",
        'friend': "Your friend's marital status",
        'relative': "Your relative's marital status"
      },
      'Birth Place': {
        'son': "Your son's birth place",
        'daughter': "Your daughter's birth place",
        'brother': "Your brother's birth place",
        'sister': "Your sister's birth place",
        'friend': "Your friend's birth place",
        'relative': "Your relative's birth place"
      },
      'Birth Time': {
        'son': "Your son's birth time",
        'daughter': "Your daughter's birth time",
        'brother': "Your brother's birth time",
        'sister': "Your sister's birth time",
        'friend': "Your friend's birth time",
        'relative': "Your relative's birth time"
      },
      'Age': {
        'son': "Your son's age",
        'daughter': "Your daughter's age",
        'brother': "Your brother's age",
        'sister': "Your sister's age",
        'friend': "Your friend's age",
        'relative': "Your relative's age"
      }
    };

    return labelMap[baseLabel]?.[profileFor] || baseLabel;
  }

  getPlaceholder(field: string): string {
    const profileFor = this.profileData.profileFor.toLowerCase();

    if (!profileFor || profileFor === 'self') {
      return `Enter ${field}`;
    }

    const relationshipMap: { [key: string]: string } = {
      'son': `Enter your son's ${field}`,
      'daughter': `Enter your daughter's ${field}`,
      'brother': `Enter your brother's ${field}`,
      'sister': `Enter your sister's ${field}`,
      'friend': `Enter your friend's ${field}`,
      'relative': `Enter your relative's ${field}`
    };

    return relationshipMap[profileFor] || `Enter ${field}`;
  }

  getAboutLabel(): string {
    const profileFor = this.profileData.profileFor.toLowerCase();

    if (!profileFor || profileFor === 'self') {
      return 'Tell Us About Yourself';
    }

    const labelMap: { [key: string]: string } = {
      'son': 'Tell Us About Your Son',
      'daughter': 'Tell Us About Your Daughter',
      'brother': 'Tell Us About Your Brother',
      'sister': 'Tell Us About Your Sister',
      'friend': 'Tell Us About Your Friend',
      'relative': 'Tell Us About Your Relative'
    };

    return labelMap[profileFor] || 'Tell Us About Yourself';
  }

  getAboutPlaceholder(): string {
    const profileFor = this.profileData.profileFor.toLowerCase();

    if (!profileFor || profileFor === 'self') {
      return 'Share a bit about yourself, your interests, values, and what you\'re looking for in a life partner...';
    }

    const placeholderMap: { [key: string]: string } = {
      'son': 'Share about your son\'s personality, interests, values, education, profession, and what kind of life partner you\'re looking for him...',
      'daughter': 'Share about your daughter\'s personality, interests, values, education, profession, and what kind of life partner you\'re looking for her...',
      'brother': 'Share about your brother\'s personality, interests, values, education, profession, and what kind of life partner you\'re looking for him...',
      'sister': 'Share about your sister\'s personality, interests, values, education, profession, and what kind of life partner you\'re looking for her...',
      'friend': 'Share about your friend\'s personality, interests, values, education, profession, and what kind of life partner they\'re looking for...',
      'relative': 'Share about your relative\'s personality, interests, values, education, profession, and what kind of life partner they\'re looking for...'
    };

    return placeholderMap[profileFor] || 'Share a bit about yourself...';
  }

  onBack() {
    this.viewChange.emit(this.previousView);
  }

  /** Password fields on create profile (signup); hidden when editing. */
  get showAccountPasswordSection(): boolean {
    return this.previousView !== 'edit-profile';
  }

  getHours(): string[] {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  }

  getMinutes(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }

  getSeconds(): string[] {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }

  /**
   * Edit profile only — load cached/API data. New registration must stay empty.
   */
  private loadExistingProfileData(): void {
    if (this.previousView !== 'edit-profile') {
      return;
    }

    const userId = this.resolveUserId();
    try {
      const cached = localStorage.getItem('my_profile_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          this.applyAccountIdentityFromResponse({
            user: parsed,
            userId: parsed.id ?? parsed.userId ?? parsed._id
          });
          this.hydrateProfileDataFromBackend(parsed);
        }
      }
    } catch {
      // Ignore cache parse errors and fall back to API
    }

    this.syncAccountIdentityFallback();

    if (!userId) {
      return;
    }

    this.loadProfilePhotosFromListApi(userId);
    this.loadExistingPdfFromApi(userId);

    this.apiService.getMyProfileDetails(userId).subscribe({
      next: (res: any) => {
        this.applyAccountIdentityFromResponse(res);
        const data =
          res?.data?.profile ||
          res?.data?.user ||
          res?.profile ||
          res?.user ||
          res?.data ||
          null;
        if (data && typeof data === 'object') {
          this.hydrateProfileDataFromBackend(data);
          this.loadProfilePhotosFromListApi(userId);
          this.loadExistingPdfFromApi(userId);
          try {
            localStorage.setItem('my_profile_data', JSON.stringify(data));
          } catch {
            // Non‑critical
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Leave the form empty if loading fails – user can still edit manually
      }
    });
  }

  /** Load marriage profile PDF from dedicated API so web reflects app uploads too. */
  private loadExistingPdfFromApi(userId: string): void {
    this.apiService.getMyPdf(userId).subscribe({
      next: (res: any) => {
        const pdfRef = this.extractPdfReferenceFromAny(res);
        if (!pdfRef) return;
        this.profileData.biodata = pdfRef;
        this.pendingBiodataFile = null;
        this.removeBiodataRequested = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {}
    });
  }

  /** Load profile photos from List My Photos API and set form grid (up to 6). */
  private loadProfilePhotosFromListApi(userId: string): void {
    this.apiService.listMyPhotos(userId).subscribe({
      next: (res: any) => {
        const success = res?.success === true || res?.data?.success === true;
        const rawPhotos = res?.photos ?? res?.data?.photos ?? res?.Photos ?? res?.data?.Photos;
        const photos = Array.isArray(rawPhotos) ? rawPhotos : [];
        if (!success || photos.length === 0) return;

        const urls = [...photos]
          .sort((a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0))
          .map((p) => (typeof p === 'string' ? p : (p as any)?.url ?? (p as any)?.imageUrl ?? (p as any)?.path))
          .filter((u): u is string => typeof u === 'string' && u.length > 0)
          .map((u) => normalizeProfileImageUrl(u))
          .slice(0, 6);

        // Do not overwrite if user has added local photos (data URLs) or removed photos (shorter than API)
        const hasLocalPhotos = this.profileData.profilePhotos.some(
          (u) => typeof u === 'string' && u.startsWith('data:')
        );
        const userMayHaveRemoved = this.profileData.profilePhotos.length > 0 &&
          this.profileData.profilePhotos.length < urls.length;
        if (urls.length > 0 && !hasLocalPhotos && !userMayHaveRemoved) {
          this.profileData.profilePhotos = [...urls];
          this.pendingPhotoFiles = urls.map(() => null);
          setTimeout(() => this.cdr.detectChanges(), 0);
        }
      },
      error: () => {}
    });
  }

  /** Profile ID and email from API root `userId` / `user.id` / `user.email`. */
  private applyAccountIdentityFromResponse(res: any): void {
    if (!res || typeof res !== 'object') {
      return;
    }

    const user =
      res.user && typeof res.user === 'object'
        ? res.user
        : res.data?.user && typeof res.data.user === 'object'
          ? res.data.user
          : null;

    const profileId =
      res.userId ??
      res.data?.userId ??
      user?.id ??
      user?.userId ??
      user?._id;

    const emailRaw = user?.email ?? res.email ?? res.data?.email;

    if (profileId != null && String(profileId).trim() !== '') {
      this.displayProfileId = String(profileId).trim();
      try {
        localStorage.setItem('profile_user_id', this.displayProfileId);
      } catch {
        // Non-critical
      }
    }

    if (emailRaw != null && String(emailRaw).trim() !== '') {
      this.displayEmail = String(emailRaw).trim();
      this.profileData.email = this.displayEmail;
    }
  }

  private syncAccountIdentityFallback(): void {
    if (!this.displayProfileId) {
      const uid = this.resolveUserId();
      if (uid) {
        this.displayProfileId = uid;
      }
    }
    if (!this.displayEmail) {
      const storedEmail = this.getStoredUser()?.email;
      if (storedEmail && String(storedEmail).trim()) {
        this.displayEmail = String(storedEmail).trim();
        this.profileData.email = this.displayEmail;
      }
    }
  }

  getDisplayProfileId(): string {
    return this.displayProfileId || this.resolveUserId() || '—';
  }

  /** Edit profile UI: first 6 chars of local part + **** + @domain (e.g. sanket****@gmail.com). */
  getDisplayEmail(): string {
    const raw = (this.displayEmail || this.profileData.email || '').trim();
    if (!raw) {
      return '—';
    }
    return this.maskEmailForDisplay(raw);
  }

  private maskEmailForDisplay(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0 || at === email.length - 1) {
      return email;
    }
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const visible = local.slice(0, 6);
    return `${visible}****@${domain}`;
  }

  /**
   * Map backend / stored profile shape back into the UI model (`profileData`).
   * We are defensive here and accept multiple possible property names so that
   * the form still works even if the API response varies slightly.
   */

  private hydrateProfileDataFromBackend(src: any): void {
    if (!src || typeof src !== 'object') {
      return;
    }

    const get = (...keys: string[]): any => {
      for (const k of keys) {
        // 1) Directly on root object
        if (k in src && src[k] != null && src[k] !== '') {
          return src[k];
        }
        // 2) Inside common nested containers like "profile" or "user"
        const containers = ['profile', 'user', 'data'];
        for (const c of containers) {
          const nested = (src as any)[c];
          if (nested && typeof nested === 'object' && k in nested && nested[k] != null && nested[k] !== '') {
            return nested[k];
          }
        }
      }
      return undefined;
    };

    const name: string =
      get('fullName', 'full_name', 'name') ??
      `${get('firstName', 'first_name', 'given_name') || ''} ${get('lastName', 'last_name', 'surname') || ''}`.trim();

    const firstName =
      get('firstName', 'first_name') ||
      (typeof name === 'string' ? name.split(/\s+/)[0] : '');

    const lastName =
      get('lastName', 'last_name') ||
      (typeof name === 'string' ? name.split(/\s+/).slice(1).join(' ') : '');

    const address = get('address');
    const currentAddress = get('currentAddress', 'current_address');
    const permanentAddress = get('permanentAddress', 'permanent_address');

    // Basic information
    const rawProfileFor = get('whoUses', 'who_uses', 'profileFor', 'profile_for');
    const normalizedProfileFor = this.normalizeProfileForFromBackend(rawProfileFor);
    if (normalizedProfileFor) {
      this.profileData.profileFor = normalizedProfileFor;
    }

    this.profileData.firstName = firstName || this.profileData.firstName;
    this.profileData.lastName = lastName || this.profileData.lastName;
    this.profileData.gender = get('gender') || this.profileData.gender;
    const rawDob =
      get('dateOfBirth', 'date_of_birth', 'dob', 'birthDate');
    const formattedDob = this.normalizeDateForInput(rawDob);
    if (formattedDob) {
      this.profileData.dateOfBirth = formattedDob;
      this.onDobChange();
    }

    const rawBirthPlace = get('birthPlace', 'birth_place', 'placeOfBirth');
    if (rawBirthPlace) this.profileData.birthPlace = rawBirthPlace;

    const rawBirthTime = get('birthTime', 'birth_time', 'timeOfBirth');
    if (rawBirthTime) {
      this.profileData.birthTime = rawBirthTime;
      const match = rawBirthTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        this.profileData.birthHours = match[1].padStart(2, '0');
        this.profileData.birthMinutes = match[2];
        this.profileData.birthTimePeriod = match[3].toUpperCase();
      }
    }

    const rawMarital = get('maritalStatus', 'marital_status');
    if (typeof rawMarital === 'string' && rawMarital.trim()) {
      const norm = rawMarital.trim().toLowerCase();
      // Legacy UI value "Never Married" → show as "Single"
      if (norm === 'never married') {
        this.profileData.maritalStatus = 'Single';
      } else {
        this.profileData.maritalStatus = rawMarital;
      }
    }

    // Contact
    this.profileData.email = get('email') || this.profileData.email;
    const rawPhone = get('phone', 'mobile', 'whatsapp', 'contactNumber');
    if (rawPhone != null && String(rawPhone).trim() !== '') {
      this.applyPhoneToForm(String(rawPhone));
    }

    // Physical
    const height = get('height');
    if (height != null && height !== '') {
      this.profileData.height = String(height);
    }
    const weight = get('weight');
    if (weight != null && weight !== '') {
      this.profileData.weight = String(weight);
    }
    this.profileData.complexion =
      get('skinTone', 'skin_tone', 'complexion') || this.profileData.complexion;

    // Lifestyle
    const doSmoke = get('doSmoke', 'smoke');
    if (typeof doSmoke === 'boolean') {
      this.profileData.smoke = doSmoke ? 'Yes' : 'No';
    } else if (typeof doSmoke === 'string') {
      this.profileData.smoke = doSmoke;
    }

    const doDrink = get('doDrink', 'drink');
    if (typeof doDrink === 'boolean') {
      this.profileData.drinks = doDrink ? 'Yes' : 'No';
    } else if (typeof doDrink === 'string') {
      this.profileData.drinks = doDrink;
    }

    this.profileData.diet = get('diet') || this.profileData.diet;

    // Religious / language (API: Hindu → form: Hinduism)
    const rawReligion = get('religion');
    const mappedReligion = this.mapReligionFromApiForForm(rawReligion);
    if (mappedReligion) {
      this.profileData.religion = mappedReligion;
    }
    this.profileData.caste = get('caste') || this.profileData.caste;
    this.profileData.subCaste = get('subCaste', 'sub_caste') || this.profileData.subCaste;
    this.profileData.motherTongue =
      get('motherTongue', 'mother_tongue') || this.profileData.motherTongue;
    const rawManglik = get('manglikStatus', 'manglik_status', 'manglik') || this.profileData.manglik;
    this.profileData.manglik = this.mapManglikFromApi(rawManglik) || this.profileData.manglik;
    this.profileData.panth = get('panth', 'gotra', 'Gotra') || this.profileData.panth;

    // Location
    this.profileData.country = get('country') || this.profileData.country;
    this.profileData.state = get('state') || this.profileData.state;
    this.profileData.city = get('city') || this.profileData.city;
    if (typeof currentAddress === 'string' && currentAddress.trim()) {
      this.profileData.currentAddress = currentAddress;
    }
    if (typeof permanentAddress === 'string' && permanentAddress.trim()) {
      this.profileData.permanentAddress = permanentAddress;
    }
    if (typeof address === 'string' && address.trim()) {
      if (!this.profileData.currentAddress?.trim()) {
        this.profileData.currentAddress = address;
      }
      if (!this.profileData.permanentAddress?.trim()) {
        this.profileData.permanentAddress = address;
      }
    }
    if (
      this.profileData.currentAddress?.trim() &&
      this.profileData.permanentAddress?.trim() &&
      this.profileData.currentAddress === this.profileData.permanentAddress
    ) {
      this.isSameAddress = true;
    }

    const landmark = get('landmark', 'land_mark', 'nearbyLandmark');
    if (typeof landmark === 'string' && landmark.trim()) {
      this.profileData.landmark = landmark.trim();
    }

    // Education / work (API stores degree in `education`, e.g. B.Tech)
    const rawEducation = get('education');
    if (rawEducation) {
      this.hydrateEducationFromApi(String(rawEducation));
    }
    this.profileData.occupation =
      get('profession', 'occupation') || this.profileData.occupation;
    // At create time we send employeeIn -> occupation; when loading back, prefer
    // any dedicated field, but fall back to occupation/profession so the UI button
    // row ("Private Sector", "Govt / Public Sector", etc.) is not empty.
    this.profileData.employeeIn =
      get('employeeIn', 'employee_in', 'employmentType') ||
      get('occupation', 'profession') ||
      this.profileData.employeeIn;
    this.profileData.companyName = get('companyName', 'company_name') || this.profileData.companyName;
    this.profileData.workLocation =
      get('workLocation', 'work_location', 'jobLocation') || this.profileData.workLocation;

    const income = get('income', 'annualIncome');
    const incomeBracket = this.mapIncomeNumberToFormBracket(income);
    if (incomeBracket) {
      this.profileData.income = incomeBracket;
    }

    // Family
    const rawFamilyStatus = get('familyStatus', 'family_status');
    const mappedFamilyStatus = this.mapFamilyStatusFromApi(rawFamilyStatus);
    if (mappedFamilyStatus) {
      this.profileData.familyStatus = mappedFamilyStatus;
    }
    this.profileData.familyType =
      get('familyType', 'family_type') || this.profileData.familyType;

    const familyValues = get('familyValues', 'family_values');
    if (Array.isArray(familyValues)) {
      this.profileData.familyValues = familyValues.map((v: any) => String(v));
    } else if (typeof familyValues === 'string' && familyValues.trim()) {
      this.profileData.familyValues = familyValues.split(',').map(v => v.trim()).filter(v => v);
    }

    const rawFamilyIncome = get('familyIncome', 'family_income');
    const familyIncomeBracket = this.mapIncomeNumberToFormBracket(rawFamilyIncome);
    if (familyIncomeBracket) {
      this.profileData.familyIncome = familyIncomeBracket;
    } else if (rawFamilyIncome != null && rawFamilyIncome !== '' && typeof rawFamilyIncome === 'string') {
      this.profileData.familyIncome = rawFamilyIncome;
    }
    this.profileData.motherOccupation =
      get('motherOccupation', 'mother_occupation') || this.profileData.motherOccupation;
    this.profileData.fatherOccupation =
      get('fatherOccupation', 'father_occupation') || this.profileData.fatherOccupation;

    // Children
    const haveChildren = get('haveChildren', 'have_children');
    if (typeof haveChildren === 'boolean') {
      this.profileData.haveChildren = haveChildren ? 'Yes' : 'No';
    } else if (typeof haveChildren === 'string') {
      this.profileData.haveChildren = haveChildren;
    }

    // About / bio
    const about =
      get('aboutMe', 'about_me', 'aboutYourself', 'about_yourself', 'bio', 'description');
    if (typeof about === 'string' && about.trim()) {
      this.profileData.aboutYourself = about;
    }

    // Profile photos – load first/primary picture and up to 6 from array
    const photos = get('profilePhotos', 'profile_photos', 'photos', 'images', 'gallery');
    if (Array.isArray(photos) && photos.length > 0) {
      const urls = photos
        .slice(0, 6)
        .map((p: any) => this.normalizeProfileImageFromBackend(p))
        .filter((u: string) => !!u);
      if (urls.length > 0) {
        this.profileData.profilePhotos = urls;
      }
    }
    if (this.profileData.profilePhotos.length === 0) {
      const picture = get(
        'profilePicture', 'profile_picture', 'firstPhotoUrl', 'first_photo_url',
        'photo', 'image', 'avatar', 'profilePhoto'
      );
      if (picture) {
        const url = this.normalizeProfileImageFromBackend(picture);
        if (url) {
          this.profileData.profilePhotos = [url];
        }
      }
    }

    // Marriage profile / biodata PDF (from app or web)
    const rawBiodata = get(
      'biodata',
      'biodata_pdf',
      'biodataPDF',
      'biodataFile',
      'biodata_file',
      'biodataFilename',
      'biodata_filename',
      'biodataName',
      'biodata_name',
      'biodataDoc',
      'biodata_doc',
      'marriageProfile',
      'marriage_profile',
      'marriage_profile_pdf',
      'biodataUrl',
      'biodata_url',
      'bio_pdf'
    );
    const normalizeBiodata = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed ? trimmed : null;
      }
      if (Array.isArray(val) && val.length > 0) {
        return normalizeBiodata(val[0]);
      }
      if (typeof val === 'object') {
        const candidate = val.url || val.path || val.src || val.href;
        return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
      }
      return null;
    };
    const biodata = normalizeBiodata(rawBiodata);
    if (biodata) {
      this.profileData.biodata = biodata;
    }

    this.applyAccountIdentityFromResponse({
      user: src,
      userId: get('userId', 'user_id', 'id')
    });

    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  /** Split API phone (+919876543210) into country code (+91) and local number (9876543210). */
  private parsePhoneFromApi(rawPhone: string): { countryCode: string; digits: string } {
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      return { countryCode: this.selectedCountryCode, digits: '' };
    }

    const allDigits = trimmed.replace(/\D/g, '');

    // Match longest country code first (+971 before +91 before +1) to avoid +919 → +91/9…
    const knownCodes = [...this.countryCodes]
      .map((c) => c.code)
      .sort((a, b) => b.length - a.length);

    if (trimmed.startsWith('+')) {
      for (const code of knownCodes) {
        if (trimmed.startsWith(code)) {
          const local = trimmed.slice(code.length).replace(/\D/g, '');
          return { countryCode: code, digits: local };
        }
      }
    }

    for (const code of knownCodes) {
      const codeDigits = code.replace(/\D/g, '');
      if (allDigits.startsWith(codeDigits) && allDigits.length > codeDigits.length + 6) {
        return { countryCode: code, digits: allDigits.slice(codeDigits.length) };
      }
    }

    // 10-digit Indian mobile without country prefix
    if (allDigits.length === 10) {
      return { countryCode: '+91', digits: allDigits };
    }

    // 12 digits starting with 91 (India)
    if (allDigits.length === 12 && allDigits.startsWith('91')) {
      return { countryCode: '+91', digits: allDigits.slice(2) };
    }

    return { countryCode: this.selectedCountryCode, digits: allDigits };
  }

  private applyPhoneToForm(rawPhone: string): void {
    const parsed = this.parsePhoneFromApi(rawPhone);
    if (parsed.countryCode) {
      const known = this.countryCodes.some((c) => c.code === parsed.countryCode);
      this.selectedCountryCode = known ? parsed.countryCode : this.selectedCountryCode;
    }
    if (parsed.digits) {
      this.profileData.phone = parsed.digits;
      this.profileData.whatsapp = parsed.digits;
    }
  }

  /** API religion → form select option (Hindu → Hinduism). */
  private mapReligionFromApiForForm(value?: string): string | undefined {
    if (!value?.trim()) {
      return undefined;
    }
    const v = value.trim().toLowerCase();
    if (v === 'hindu') return 'Hinduism';
    if (v === 'christian') return 'Christianity';
    if (v === 'sikh') return 'Sikhism';
    if (v === 'buddhist') return 'Buddhism';
    if (v === 'jain') return 'Jainism';
    if (this.religionOptions.includes(value.trim())) {
      return value.trim();
    }
    return value.trim();
  }

  /** API familyStatus → form option (Middle class → Middle Class). */
  private mapFamilyStatusFromApi(value?: string): string | undefined {
    if (!value?.trim()) {
      return undefined;
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    const match = this.familyStatusOptions.find(
      (opt) => opt.replace(/\s+/g, ' ').trim().toLowerCase() === normalized.toLowerCase()
    );
    if (match) {
      return match;
    }
    if (/middle/i.test(normalized)) return 'Middle Class';
    if (/upper/i.test(normalized)) return 'Upper Middle Class';
    if (/rich|affluence/i.test(normalized)) return 'Rich / Affluence';
    return normalized;
  }

  /**
   * API stores numeric income; form uses bracket labels in the dropdown.
   */
  private mapIncomeNumberToFormBracket(value: unknown): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    if (typeof value === 'string' && this.familyIncomeOptions.includes(value.trim())) {
      return value.trim();
    }

    const amount = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      return undefined;
    }

    const brackets: { label: string; mid: number }[] = [
      { label: 'Less than 1 Lakh', mid: 75_000 },
      { label: '1 Lakh - 2 Lakh', mid: 150_000 },
      { label: '2 Lakh - 5 Lakh', mid: 350_000 },
      { label: '5 Lakh - 10 Lakh', mid: 750_000 },
      { label: '10 Lakh - 20 Lakh', mid: 1_500_000 },
      { label: '20 Lakh - 50 Lakh', mid: 3_500_000 },
      { label: 'More than 50 Lakh', mid: 6_000_000 }
    ];

    let closest = brackets[0];
    let minDiff = Math.abs(amount - closest.mid);
    for (const b of brackets) {
      const diff = Math.abs(amount - b.mid);
      if (diff < minDiff) {
        minDiff = diff;
        closest = b;
      }
    }
    return closest.label;
  }

  /** Map API `education` (often a degree) back to education + degree dropdowns. */
  private hydrateEducationFromApi(rawEducation: string): void {
    const val = rawEducation.trim();
    if (!val) {
      return;
    }

    if (this.educationOptions.includes(val)) {
      this.profileData.education = val;
      return;
    }

    for (const [level, degrees] of Object.entries(this.degreeOptionsMap)) {
      if (degrees.includes(val)) {
        this.profileData.education = level;
        this.profileData.degree = val;
        return;
      }
    }

    for (const [level, degrees] of Object.entries(this.degreeOptionsMap)) {
      if (degrees.some((d) => d.toLowerCase() === val.toLowerCase())) {
        this.profileData.education = level;
        this.profileData.degree = degrees.find((d) => d.toLowerCase() === val.toLowerCase()) || val;
        return;
      }
    }

    this.profileData.education = val;
  }

  /**
   * Payload aligned with POST /api/auth/create-profile (https://vescript.vescript.com).
   * Password is set via /auth/set-password during signup before create — not sent on create-profile.
   */
  private buildCreateProfilePayload(forEdit = false) {
    const user = this.getStoredUser();
    const fullName = `${this.profileData.firstName} ${this.profileData.lastName}`.trim();
    const dateOfBirth = this.normalizeDateForInput(this.profileData.dateOfBirth);
    const age = this.calculateAge(dateOfBirth);
    const phoneRaw = this.profileData.phone || this.profileData.whatsapp || user?.phone || '';
    const formattedPhone = phoneRaw ? this.normalizePhoneForApi(String(phoneRaw)) : undefined;

    const allowedKeys = new Set([
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
      'panth',
      'city',
      'state',
      'country',
      'address',
      'landmark',
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
      'bio',
      ...(forEdit ? ['birthPlace', 'birthTime'] : [])
    ]);

    const rawPayload: Record<string, any> = {
      phone: formattedPhone,
      fullName: fullName || undefined,
      whoUses: this.normalizeWhoUses(this.profileData.profileFor),
      gender: this.profileData.gender || undefined,
      dateOfBirth,
      age,
      height: this.toNumber(this.profileData.height),
      weight: this.toNumber(this.profileData.weight),
      skinTone: this.profileData.complexion || undefined,
      doSmoke: this.toBoolean(this.profileData.smoke) ?? false,
      doDrink: this.toBoolean(this.profileData.drinks) ?? false,
      diet: this.profileData.diet || undefined,
      religion: this.normalizeReligionForApi(this.profileData.religion),
      caste: this.profileData.caste || undefined,
      subCaste: this.profileData.subCaste || undefined,
      panth: this.profileData.panth || undefined,
      city: this.profileData.city || undefined,
      state: this.profileData.state || undefined,
      country: this.profileData.country || undefined,
      address: this.profileData.permanentAddress || this.profileData.currentAddress || undefined,
      landmark: this.profileData.landmark || undefined,
      profession: this.profileData.occupation || undefined,
      occupation: this.profileData.employeeIn || undefined,
      education: this.profileData.degree?.trim() || this.profileData.education || undefined,
      income: this.parseIncomeBracketToNumber(this.profileData.income),
      companyName: this.profileData.companyName || undefined,
      workLocation: this.profileData.workLocation || undefined,
      maritalStatus: this.normalizeMaritalStatus(this.profileData.maritalStatus),
      haveChildren: this.toBoolean(this.profileData.haveChildren) ?? false,
      motherTongue: this.profileData.motherTongue || undefined,
      manglikStatus: this.normalizeManglikStatus(this.profileData.manglik),
      aboutMe: this.profileData.aboutYourself || undefined,
      familyStatus: this.profileData.familyStatus || undefined,
      familyValues: this.profileData.familyValues.length > 0 ? this.profileData.familyValues.join(', ') : undefined,
      familyType: this.profileData.familyType || undefined,
      familyIncome: this.parseIncomeBracketToNumber(this.profileData.familyIncome),
      motherOccupation: this.profileData.motherOccupation || undefined,
      fatherOccupation: this.profileData.fatherOccupation || undefined,
      bio: this.profileData.aboutYourself || undefined
    };

    if (forEdit) {
      rawPayload['birthPlace'] = this.profileData.birthPlace || undefined;
      const birthTime = this.formatBirthTimeForApi();
      if (birthTime) {
        rawPayload['birthTime'] = birthTime;
      }
    } else {
      const userId = this.resolveUserId() || user?.id || user?._id || user?.userId || undefined;
      if (userId) {
        rawPayload['userId'] = userId;
      }
    }

    const schemaPayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([k]) => allowedKeys.has(k))
    );

    return this.cleanPayload(schemaPayload);
  }

  /**
   * Build body for POST /api/auth/create-profile — matches Vescript API spec exactly.
   */
  private buildCreateProfileApiBody(userId: string | number): CreateProfileRequest {
    const user = this.getStoredUser();
    const fullName = `${this.profileData.firstName} ${this.profileData.lastName}`.trim();
    const dateOfBirth = this.normalizeDateForInput(this.profileData.dateOfBirth) || '';
    const age = this.calculateAge(dateOfBirth) ?? 0;
    const phoneRaw = this.profileData.phone || this.profileData.whatsapp || user?.phone || '';
    const about = this.profileData.aboutYourself?.trim() || '';

    const numericUserId = Number(userId);
    const income = this.parseIncomeBracketToNumber(this.profileData.income) ?? 0;
    const familyIncome = this.parseIncomeBracketToNumber(this.profileData.familyIncome) ?? 0;
    const height = this.toNumber(this.profileData.height) ?? 0;
    const weight = this.toNumber(this.profileData.weight) ?? 0;

    const body: CreateProfileRequest = {
      userId: Number.isFinite(numericUserId) ? numericUserId : Number(userId),
      phone: this.normalizePhoneForApi(phoneRaw),
      fullName,
      whoUses: this.normalizeWhoUses(this.profileData.profileFor) || 'self',
      gender: this.profileData.gender || 'Male',
      dateOfBirth,
      age,
      height,
      weight,
      skinTone: this.profileData.complexion || 'Fair',
      doSmoke: this.toBoolean(this.profileData.smoke) ?? false,
      doDrink: this.toBoolean(this.profileData.drinks) ?? false,
      diet: this.profileData.diet || 'Vegetarian',
      religion: this.normalizeReligionForApi(this.profileData.religion) || 'Hindu',
      caste: this.profileData.caste || '',
      subCaste: this.profileData.subCaste?.trim() || '',
      city: this.profileData.city || '',
      state: this.profileData.state || '',
      country: this.profileData.country || 'India',
      address:
        this.profileData.permanentAddress?.trim() ||
        this.profileData.currentAddress?.trim() ||
        '',
      profession: this.profileData.occupation?.trim() || '',
      occupation: this.profileData.employeeIn?.trim() || '',
      education: this.profileData.degree?.trim() || this.profileData.education?.trim() || '',
      workExperience: 0,
      income,
      companyName: this.profileData.companyName?.trim() || '',
      workLocation: this.profileData.workLocation?.trim() || this.profileData.city || '',
      maritalStatus: this.normalizeMaritalStatus(this.profileData.maritalStatus) || 'Single',
      haveChildren: this.toBoolean(this.profileData.haveChildren) ?? false,
      motherTongue: this.profileData.motherTongue?.trim() || '',
      manglikStatus: this.normalizeManglikStatus(this.profileData.manglik) || 'No',
      aboutMe: about,
      familyStatus: this.normalizeFamilyStatusForApi(this.profileData.familyStatus) || 'Middle class',
      familyValues:
        this.profileData.familyValues.length > 0
          ? this.profileData.familyValues.join(', ')
          : 'Traditional',
      familyType: this.profileData.familyType || 'Nuclear',
      familyIncome,
      motherOccupation: this.profileData.motherOccupation?.trim() || '',
      fatherOccupation: this.profileData.fatherOccupation?.trim() || '',
      profilePicture: '',
      bio: about || 'Profile bio text'
    };

    return body;
  }

  private validateCreateProfileApiBody(userId: string | number): string | null {
    if (userId == null || String(userId).trim() === '') {
      return 'Account ID is missing. Please restart registration from OTP.';
    }
    if (!this.profileData.firstName?.trim() || !this.profileData.lastName?.trim()) {
      return 'Please enter your first and last name.';
    }
    if (!this.profileData.gender) {
      return 'Please select your gender.';
    }
    if (!this.profileData.dateOfBirth) {
      return 'Please enter your date of birth.';
    }
    if (!this.profileData.phone?.trim() && !this.profileData.whatsapp?.trim()) {
      return 'Please enter your phone number.';
    }
    if (!this.profileData.religion) {
      return 'Please select your religion.';
    }
    if (!this.profileData.city || !this.profileData.state) {
      return 'Please select your city and state.';
    }
    return null;
  }

  private normalizePhoneForApi(phone: string): string {
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) {
      return '';
    }
    const code = this.selectedCountryCode.replace(/\s/g, '');
    const codeDigits = code.replace(/\D/g, '');

    let local = digits;
    if (codeDigits && local.startsWith(codeDigits) && local.length > codeDigits.length) {
      local = local.slice(codeDigits.length);
    } else if (local.length === 12 && local.startsWith('91')) {
      local = local.slice(2);
    }

    return `${code}${local}`;
  }

  private normalizeFamilyStatusForApi(value?: string): string {
    if (!value?.trim()) {
      return 'Middle class';
    }
    const v = value.trim().replace(/\s+/g, ' ');
    if (/middle/i.test(v)) {
      return 'Middle class';
    }
    if (/upper/i.test(v)) {
      return 'Upper middle class';
    }
    if (/rich|affluence/i.test(v)) {
      return 'Rich / Affluence';
    }
    return v;
  }

  /**
   * Align payload for POST /api/profiles/update.
   */
  private finalizePayloadForApi(
    payload: Record<string, unknown>,
    mode: 'edit'
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { ...payload };

    if (out['userId'] != null && String(out['userId']).trim() !== '') {
      const numericUserId = Number(out['userId']);
      out['userId'] = Number.isFinite(numericUserId) ? numericUserId : out['userId'];
    }

    if (typeof out['phone'] === 'string') {
      out['phone'] = this.normalizePhoneForApi(out['phone']);
    }

    if (out['height'] != null) {
      const h = Number(out['height']);
      if (Number.isFinite(h)) out['height'] = h;
    }
    if (out['weight'] != null) {
      const w = Number(out['weight']);
      if (Number.isFinite(w)) out['weight'] = w;
    }

    if (typeof out['familyStatus'] === 'string') {
      out['familyStatus'] = this.normalizeFamilyStatusForApi(out['familyStatus']);
    }

    return out;
  }

  private mapManglikFromApi(value?: string): string | undefined {
    if (!value?.trim()) return undefined;
    const v = value.trim().toLowerCase();
    if (v === 'no') return 'Non-Manglik';
    if (v === 'yes') return 'Manglik';
    if (v.includes('anshik')) return 'Anshik/Partial Manglik';
    return value.trim();
  }

  /** Map UI manglik options to API values (e.g. "No", "Yes"). */
  private normalizeManglikStatus(value?: string): string | undefined {
    if (!value?.trim()) return undefined;
    const v = value.trim().toLowerCase();
    if (v.includes('non') || v === 'no') return 'No';
    if (v.includes('anshik') || v.includes('partial')) return 'Anshik';
    if (v.includes("don't") || v.includes('dont know')) return 'No';
    if (v.includes('manglik')) return 'Yes';
    return value.trim();
  }

  private syncPdfAfterProfileSave(userId: string, onDone: (softError?: string) => void): void {
    if (this.removeBiodataRequested) {
      this.apiService.deleteMyPdf(userId).subscribe({
        next: () => {
          this.removeBiodataRequested = false;
          this.pendingBiodataFile = null;
          this.profileData.biodata = null;
          onDone();
        },
        error: (err: any) => {
          const backendMsg = err?.error?.message || err?.error?.error || err?.message;
          onDone(`Profile updated but marriage profile PDF could not be removed.${backendMsg ? ' Reason: ' + backendMsg : ''} Please try again from Marriage Profile section.`);
        }
      });
      return;
    }

    if (!this.pendingBiodataFile) {
      onDone();
      return;
    }

    const file = this.pendingBiodataFile;
    this.uploadPdfWithReplace(
      userId,
      file,
      (uploadRes: any) => {
        this.pendingBiodataFile = null;
        this.removeBiodataRequested = false;
        const pdfRef = this.extractPdfReferenceFromResponse(uploadRes);
        if (pdfRef) {
          this.profileData.biodata = pdfRef;
        }
        onDone();
      },
      (err: any) => {
        const backendMsg = err?.error?.message || err?.error?.error || err?.message;
        onDone(`Profile updated but marriage profile PDF could not be uploaded.${backendMsg ? ' Reason: ' + backendMsg : ''} Please try again from Marriage Profile section.`);
      }
    );
  }

  private uploadPdfWithReplace(
    userId: string,
    file: File,
    onSuccess: (res: any) => void,
    onError: (err: any) => void
  ): void {
    this.apiService.uploadProfilePdf(userId, file).subscribe({
      next: onSuccess,
      error: (err: any) => {
        if (!this.isPdfReplaceRequiredError(err)) {
          onError(err);
          return;
        }
        this.apiService.deleteMyPdf(userId).subscribe({
          next: () => {
            this.apiService.uploadProfilePdf(userId, file).subscribe({
              next: onSuccess,
              error: onError
            });
          },
          error: onError
        });
      }
    });
  }

  private isPdfReplaceRequiredError(err: any): boolean {
    const msg = String(err?.error?.message || err?.error?.error || err?.message || '').toLowerCase();
    return msg.includes('only one pdf per user allowed');
  }

  private extractPdfReferenceFromResponse(res: any): string | null {
    return this.extractPdfReferenceFromAny(res);
  }

  private extractPdfReferenceFromAny(res: any): string | null {
    const tryGet = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed ? trimmed : null;
      }
      if (Array.isArray(val) && val.length > 0) {
        return tryGet(val[0]);
      }
      if (typeof val === 'object') {
        const candidate =
          val.pdfUrl ??
          val.url ??
          val.path ??
          val.file ??
          val.document ??
          val.biodata ??
          val.biodataUrl ??
          val.marriageProfile ??
          val.marriage_profile ??
          val.marriage_profile_pdf ??
          val.src ??
          val.href;
        if (candidate !== undefined) {
          return tryGet(candidate);
        }
      }
      return null;
    };

    const direct =
      tryGet(res?.data?.pdfUrl) ||
      tryGet(res?.data?.url) ||
      tryGet(res?.data?.path) ||
      tryGet(res?.data?.pdf) ||
      tryGet(res?.data?.file) ||
      tryGet(res?.data?.document) ||
      tryGet(res?.data?.biodata) ||
      tryGet(res?.data?.biodataUrl) ||
      tryGet(res?.data?.marriageProfile) ||
      tryGet(res?.data?.marriage_profile) ||
      tryGet(res?.data?.marriage_profile_pdf) ||
      tryGet(res?.pdfUrl) ||
      tryGet(res?.url) ||
      tryGet(res?.path) ||
      tryGet(res?.pdf) ||
      tryGet(res?.file) ||
      tryGet(res?.document) ||
      tryGet(res?.biodata) ||
      tryGet(res?.biodataUrl) ||
      tryGet(res?.marriageProfile) ||
      tryGet(res?.marriage_profile) ||
      tryGet(res?.marriage_profile_pdf);

    return direct || null;
  }

  private getStoredUser(): any {
    const stored = localStorage.getItem('user');
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private normalizeWhoUses(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'self') {
      return 'self';
    }
    return normalized;
  }

  /** API stores religion as Hindu, Christian, etc. — not Hinduism. */
  private normalizeReligionForApi(value?: string): string | undefined {
    if (!value?.trim()) {
      return undefined;
    }
    const v = value.trim().toLowerCase();
    if (v === 'hinduism' || v === 'hindu') return 'Hindu';
    if (v === 'christianity' || v === 'christian') return 'Christian';
    if (v === 'sikhism' || v === 'sikh') return 'Sikh';
    if (v === 'buddhism' || v === 'buddhist') return 'Buddhist';
    if (v === 'jainism' || v === 'jain') return 'Jain';
    return value.trim();
  }

  /**
   * Form income options are text brackets (e.g. "5 Lakh - 10 Lakh").
   * API expects a numeric annual income — never send raw bracket strings.
   */
  private parseIncomeBracketToNumber(value?: string): number | undefined {
    if (!value?.trim()) {
      return undefined;
    }
    const trimmed = value.trim();
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }

    const lower = trimmed.toLowerCase();
    const lakh = 100_000;
    const numbers = (lower.match(/(\d+(?:\.\d+)?)/g) ?? []).map(Number).filter(Number.isFinite);
    if (numbers.length === 0) {
      return undefined;
    }

    if (lower.includes('less than')) {
      return Math.round(numbers[0] * lakh * 0.75);
    }
    if (lower.includes('more than')) {
      return Math.round(numbers[0] * lakh * 1.25);
    }
    if (numbers.length >= 2) {
      return Math.round(((numbers[0] + numbers[1]) / 2) * lakh);
    }
    return Math.round(numbers[0] * lakh);
  }

  private extractUserIdFromAuthResponse(response: any): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }
    const id =
      response.userId ??
      response.id ??
      response.user?.id ??
      response.user?.userId ??
      response.data?.userId ??
      response.data?.id ??
      response.data?.user?.id ??
      response.data?.user?.userId;
    return id != null && String(id).trim() !== '' ? String(id) : null;
  }

  private normalizeLowercase(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    return normalized || undefined;
  }

  private normalizeMaritalStatus(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    if (normalized.toLowerCase() === 'never married') {
      return 'Single';
    }
    return normalized;
  }

  private formatBirthTimeForApi(): string | undefined {
    const hours = this.profileData.birthHours?.trim();
    const minutes = this.profileData.birthMinutes?.trim();
    const period = this.profileData.birthTimePeriod?.trim().toUpperCase();
    if (!hours || !minutes || !period) {
      return this.profileData.birthTime?.trim() || undefined;
    }
    if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || !/^(AM|PM)$/.test(period)) {
      return this.profileData.birthTime?.trim() || undefined;
    }
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} ${period}`;
  }

  private cleanPayload<T extends Record<string, any>>(payload: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    ) as Partial<T>;
  }

  private toNumberOrString(value: any): number | string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const asNumber = Number(trimmed);
    return Number.isFinite(asNumber) ? asNumber : trimmed;
  }

  private toNumber(value: string): number | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toBoolean(value: string): boolean | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (['yes', 'true', 'y'].includes(normalized)) {
      return true;
    }
    if (['no', 'false', 'n'].includes(normalized)) {
      return false;
    }
    return undefined;
  }

  /**
   * Normalise image URLs coming back from the backend so that they display
   * correctly in the browser, similar to the dashboard cards.
   */
  private normalizeProfileImageFromBackend(val: any): string {
    const normalizeProfileUrl = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      // Strip trailing ".profile" after image extension if present
      return trimmed.replace(/(\.(?:jpg|jpeg|png|webp))\.profile(\b|$)/i, '$1$2');
    };

    const toAbsolute = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      let normalized = normalizeProfileUrl(url);
      if (normalized.startsWith('data:') || normalized.startsWith('http') || normalized.startsWith('//')) {
        return normalizeProfileImageUrl(normalized);
      }
      normalized = normalizeProfileUrl(normalized);
      const full = 'https://vescript.vescript.com' + (normalized.startsWith('/') ? '' : '/') + normalized;
      return normalizeProfileImageUrl(full);
    };

    if (typeof val === 'string' && val.trim()) {
      const first = val.split(',')[0].trim();
      return toAbsolute(first);
    }
    if (val && typeof val === 'object') {
      const raw = val.url || val.path || val.src || val.image || val.uri || '';
      return toAbsolute(raw);
    }
    return '';
  }

  /**
   * Convert backend "whoUses" / relationship value into the exact label used by
   * the UI dropdown (Self, Son, Daughter, Brother, Sister, Friend, Relative).
   */
  private normalizeProfileForFromBackend(value: any): string | undefined {
    if (!value) {
      return undefined;
    }
    const v = String(value).trim().toLowerCase();
    if (!v) {
      return undefined;
    }
    const map: { [key: string]: string } = {
      'self': 'Self',
      'me': 'Self',
      'myself': 'Self',
      'son': 'Son',
      'daughter': 'Daughter',
      'brother': 'Brother',
      'sister': 'Sister',
      'friend': 'Friend',
      'relative': 'Relative',
      'relatives': 'Relative'
    };
    return map[v] || value;
  }

  /**
   * Normalise various backend date formats (including full ISO timestamps) into
   * the plain yyyy-MM-dd format expected by the HTML date input.
   */
  private normalizeDateForInput(raw: any): string | undefined {
    if (!raw) {
      return undefined;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) {
        return undefined;
      }
      // Already in yyyy-MM-dd format
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
      return undefined;
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return raw.toISOString().slice(0, 10);
    }
    return undefined;
  }

  private calculateAge(dateOfBirth?: string): number | undefined {
    if (!dateOfBirth) {
      return undefined;
    }
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return undefined;
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }

  onInputCapitalize(event: any, field: keyof ProfileData) {
    const value = event.target.value;
    if (value && value.length > 0) {
      // Capitalize first letter only
      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
      (this.profileData as any)[field] = capitalized;
    }
  }
}

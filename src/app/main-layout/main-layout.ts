import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

import { NavbarComponent } from '../navbar/navbar.component';
import { HeroComponent } from '../hero/hero.component';
import { StatsComponent } from '../stats/stats.component';
import { SearchComponent } from '../search/search.component';
import { HowWorksComponent } from '../how-works/how-works.component';
import { HowSectionComponent } from '../how-section/how-section.component';
import { PromisesComponent } from '../promises/promises.component';
import { StoriesComponent } from '../stories/stories.component';
import { DivineMatchComponent } from '../divine-match/divine-match.component';
import { FooterComponent } from '../footer/footer.component';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { SignupComponent } from '../signup/signup.component';
import { EmailOtpComponent } from '../email-otp/email-otp.component';
import { SetPasswordComponent } from '../set-password/set-password.component';
import { ProfileFormComponent } from '../profile-form/profile-form.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SettingsComponent } from '../settings/settings.component';
import { NotificationSettingsComponent } from '../notification-settings/notification-settings.component';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { PrivacySettingsComponent } from '../privacy-settings/privacy-settings.component';
import { LanguageComponent } from '../language/language.component';
import { ViewState } from '../types';
import { ChatDetailComponent } from '../chat-detail/chat-detail.component';
import { MessagesComponent } from '../messages/messages.component';
import { FavoritesComponent } from '../favorites/favorites.component';
import { ProfileDetailComponent } from '../profile-detail/profile-detail.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { WelcomeComponent } from '../welcome/welcome.component';
import { PartnerPreferencesComponent } from '../partner-preferences/partner-preferences.component';
import { PhotoGalleryComponent } from '../photo-gallery/photo-gallery.component';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { ReportedBlockedUsersComponent } from '../reported-blocked-users/reported-blocked-users.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeroComponent,
    StatsComponent,
    SearchComponent,
    HowWorksComponent,
    HowSectionComponent,
    PromisesComponent,
    StoriesComponent,
    DivineMatchComponent,
    FooterComponent,
    UserProfileComponent,
    SignupComponent,
    EmailOtpComponent,
    SetPasswordComponent,
    ProfileFormComponent,
    DashboardComponent,
    SettingsComponent,
    NotificationSettingsComponent,
    ChangePasswordComponent,
    PrivacySettingsComponent,
    LanguageComponent,
    MessagesComponent,
    ChatDetailComponent,
    FavoritesComponent,
    ProfileDetailComponent,
    NotificationsComponent,
    WelcomeComponent,
    PartnerPreferencesComponent,
    PhotoGalleryComponent,
    PrivacyPolicyComponent,
    ReportedBlockedUsersComponent
  ],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent implements OnInit {
  currentView: ViewState = 'home';
  previousView: ViewState = 'home';
  selectedProfileId = 0;
  currentLang: 'en' | 'hi' | 'mr' = 'en';

  private translations: Record<'en' | 'hi' | 'mr', {
    title: string;
    subtitle: string;
    mantra: string;
    tagline: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    login: string;
    register: string;
    backHome: string;
    loginWelcome: string;
    emailLabel: string;
    passwordLabel: string;
    continueGoogle: string;
    regWelcome: string;
    mobileLabel: string;
    profileLabel: string;
    registerMe: string;
    statsProfiles: string;
    statsUnions: string;
    statsCommunities: string;
    searchHeading: string;
    searchSubheading: string;
    labelLookingFor: string;
    labelAgeRange: string;
    labelGotra: string;
    labelMotherTongue: string;
    placeholderSelect: string;
    searchBtn: string;
    howHeading: string;
    step1Title: string;
    step1Desc: string;
    step1Link: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step3Link: string;
    successHeading: string;
    successSubheading: string;
    successDesc: string;
    story1Quote: string;
    story1Names: string;
    story1Loc: string;
    story1Photo: string;
    story2Quote: string;
    story2Names: string;
    story2Loc: string;
    story2Photo: string;
    story3Quote: string;
    story3Names: string;
    story3Loc: string;
    story3Photo: string;
    story4Quote: string;
    story4Names: string;
    story4Loc: string;
    story4Photo: string;
    loveStoryHeading: string;
    loveStoryQuote: string;
    krishnaLoveQuote: string;
    ctaFinalHeading: string;
    ctaFinalBtn: string;
    footerDesc: string;
    quickLinks: string;
    browseBy: string;
    support: string;
    aboutUs: string;
    premiumPlans: string;
    contactUs: string;
    rashi: string;
    cityState: string;
    profession: string;
    helpCenter: string;
    safetyTips: string;
    privacyPolicy: string;
    terms: string;
    copyright: string;
  }> = {
      en: {
        title: 'RUKMINI',
        subtitle: 'Swayamvar',
        mantra: 'ॐ श्री कृष्णाय नमः',
        tagline: 'Where Divine Love Inspires Sacred Unions',
        description: 'The divine union of two souls',
        ctaPrimary: 'Begin Your Journey',
        ctaSecondary: 'Browse Profiles',
        login: 'Login',
        register: 'Register',
        backHome: 'Back to Home',
        loginWelcome: 'Welcome back',
        emailLabel: 'Email Address',
        passwordLabel: 'Password',
        continueGoogle: 'Continue with Google',
        regWelcome: 'Join Our Sacred Community',
        mobileLabel: 'Mobile Number',
        profileLabel: 'Registering Profile For',
        registerMe: 'Register Now',
        statsProfiles: 'Sacred Profiles',
        statsUnions: 'Divine Unions',
        statsCommunities: 'Communities',
        searchHeading: 'Begin Your Search',
        searchSubheading: 'Find Your Destined Partner',
        labelLookingFor: 'Looking For',
        labelAgeRange: 'Age Range',
        labelGotra: 'Gotra / Community',
        labelMotherTongue: 'Mother Tongue',
        placeholderSelect: 'Select Option',
        searchBtn: 'Search Profiles',
        howHeading: 'How Rukmini Swayamvar works',
        step1Title: 'Discover Sacred Profiles',
        step1Desc: 'See who is seeking a life partner within our blessed community and traditions.',
        step1Link: 'Search profiles and groups',
        step2Title: 'Find Your Divine Match',
        step2Desc: 'Connect over shared values, genuine compatibility, and meaningful family traditions.',
        step3Title: 'Begin Your Sacred Journey',
        step3Desc: 'Find your destined life partner and draw blessings from a community of millions.',
        step3Link: 'Start your journey',
        successHeading: 'Success Stories',
        successSubheading: 'Blessed Unions',
        successDesc: 'Real families, real blessings — hear from our happily married couples',
        story1Quote: 'By the grace of Lord Krishna, we found each other on Rukmini Swayamvar. The kundali matching was spot on!',
        story1Names: 'Neha & Amit',
        story1Loc: 'Mumbai',
        story1Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        story2Quote: 'The traditional values embedded in this platform gave our parents immense confidence. We found our soulmate.',
        story2Names: 'Kavitha & Suresh',
        story2Loc: 'Chennai',
        story2Photo: 'https://i.pinimg.com/1200x/0f/0b/4e/0f0b4eaa59bfe3e10bf5f5e29bfb5711.jpg',
        story3Quote: 'What impressed us was the sacred approach to matchmaking. No shortcuts, just genuine profiles and divine guidance.',
        story3Names: 'Simran & Rajveer',
        story3Loc: 'Jaipur',
        story3Photo: 'https://i.pinimg.com/1200x/74/97/0e/74970e9f546671db9ad6abe0c6cb6814.jpg',
        story4Quote: 'Our families were initially skeptical about online matchmaking, but Rukmini Swayamvar proved them wrong. We found true love with divine blessings.',
        story4Names: 'Priya & Karan',
        story4Loc: 'Kolkata',
        story4Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        loveStoryHeading: 'A Divine Legacy',
        loveStoryQuote: 'When faith chose courage and destiny chose love, Rukmini\'s swayamvar became the triumph of the heart.',
        krishnaLoveQuote: 'I am the same to all beings; my love is ever the same.',
        ctaFinalHeading: 'Ready to find your Divine Match?',
        ctaFinalBtn: 'Register Now — It\'s Free',
        footerDesc: 'Blessed by the divine love of Bhagwan Krishna & Devi Rukmini. India\'s most sacred matrimonial platform.',
        quickLinks: 'Quick Links',
        browseBy: 'Browse By',
        support: 'Support',
        aboutUs: 'About Us',
        premiumPlans: 'Premium Plans',
        contactUs: 'Contact Us',
        rashi: 'Rashi / Nakshatra',
        cityState: 'City / State',
        profession: 'Profession',
        helpCenter: 'Help Center',
        safetyTips: 'Safety Tips',
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms of Service',
        copyright: '© 2026 Rukmini Swayamvar. All rights reserved. Made with 🙏 & divine blessings in India'
      },
      hi: {
        title: 'रुक्मिणी',
        subtitle: 'स्वयंवर',
        mantra: 'ॐ श्री कृष्णाय नमः',
        tagline: 'जहाँ दिव्य प्रेम पवित्र मिलन को प्रेरित करता है',
        description: 'The divine union of two souls',
        ctaPrimary: 'अपनी यात्रा शुरू करें',
        ctaSecondary: 'प्रोफाइल देखें',
        login: 'लॉगिन',
        register: 'रजिस्टर',
        backHome: 'होम पर वापस जाएं',
        loginWelcome: 'फिर से स्वागत है',
        emailLabel: 'ईमेल पता',
        passwordLabel: 'पासवर्ड',
        continueGoogle: 'Google के साथ जारी रखें',
        regWelcome: 'हमारे पवित्र समुदाय में शामिल हों',
        mobileLabel: 'मोबाइल नंबर',
        profileLabel: 'किसके लिए प्रोफाइल रजिस्टर कर रहे हैं',
        registerMe: 'अभी रजिस्टर करें',
        statsProfiles: 'पवित्र प्रोफाइल',
        statsUnions: 'दिव्य मिलन',
        statsCommunities: 'समुदाय',
        searchHeading: 'अपनी खोज शुरू करें',
        searchSubheading: 'अपना भाग्यशाली साथी खोजें',
        labelLookingFor: 'खोज रहे हैं',
        labelAgeRange: 'आयु सीमा',
        labelGotra: 'गोत्र / समुदाय',
        labelMotherTongue: 'मातृभाषा',
        placeholderSelect: 'विकल्प चुनें',
        searchBtn: 'प्रोफाइल खोजें',
        howHeading: 'रुक्मिणी स्वयंवर कैसे काम करता है',
        step1Title: 'पवित्र प्रोफाइल खोजें',
        step1Desc: 'देखें कि हमारे धन्य समुदाय और परंपराओं के भीतर जीवनसाथी कौन ढूंढ रहा है।',
        step1Link: 'प्रोफाइल और समूह खोजें',
        step2Title: 'अपना दिव्य साथी खोजें',
        step2Desc: 'साझा मूल्यों, ज्योतिषीय संगतता और सार्थक पारिवारिक परंपराओं पर जुड़ें।',
        step3Title: 'अपनी पवित्र यात्रा शुरू करें',
        step3Desc: 'अपना नियत जीवनसाथी खोजें और लाखों लोगों के समुदाय से आशीर्वाद प्राप्त करें।',
        step3Link: 'यात्रा शुरू करें',
        successHeading: 'सफलता की कहानियां',
        successSubheading: 'धन्य मिलन',
        successDesc: 'वास्तविक परिवार, असली आशीर्वाद — हमारे सुखी विवाहित जोड़ों से सुनें',
        story1Quote: 'भगवान कृष्ण की कृपा से, हमने रुक्मिणी स्वयंवर पर एक दूसरे को पाया। कुंडली मिलान बिल्कुल सही था!',
        story1Names: 'नेहा और अमित',
        story1Loc: 'मुंबई',
        story1Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        story2Quote: 'इस प्लेटफॉर्म में निहित पारंपरिक मूल्यों ने हमारे माता-पिता को अपार आत्मविश्वास दिया। हमने अपने जीवनसाथी को खोज लिया।',
        story2Names: 'कविता और सुरेश',
        story2Loc: 'चेन्नई',
        story2Photo: 'https://i.pinimg.com/1200x/0f/0b/4e/0f0b4eaa59bfe3e10bf5f5e29bfb5711.jpg',
        story3Quote: 'जो हमें प्रभावित किया वह मिलन के प्रति पवित्र दृष्टिकोण था। कोई शॉर्टकट नहीं, बस असली प्रोफाइल और दिव्य मार्गदर्शन।',
        story3Names: 'सिमरन और राजवीर',
        story3Loc: 'जयपुर',
        story3Photo: 'https://i.pinimg.com/1200x/74/97/0e/74970e9f546671db9ad6abe0c6cb6814.jpg',
        story4Quote: 'हमारे परिवार ऑनलाइन मैचिंग को लेकर चिंता थे, लेकिन रुक्मिणी स्वयंवर ने उन्हें साबित किया। हमनें दिव्य प्रेम साथ सच्चा पाया।',
        story4Names: 'प्रिया और करण',
        story4Loc: 'कोलकाता',
        story4Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        loveStoryHeading: 'एक दिव्य विरासत',
        loveStoryQuote: 'जब विश्वास ने साहस को और नियति ने प्रेम को चुना, तब रुक्मिणी का स्वयंवर हृदय की विजय बन गया।',
        krishnaLoveQuote: 'मैं सभी प्राणियों के लिए समान हूँ; मेरा प्रेम सदैव समान रहता है।',
        ctaFinalHeading: 'क्या आप अपना दिव्य साथी खोजने के लिए तैयार हैं?',
        ctaFinalBtn: 'अभी पंजीकरण करें — यह मुफ़्त है',
        footerDesc: 'भगवान कृष्ण और देवी रुक्मिणी के दिव्य प्रेम से धन्य। भारत का सबसे पवित्र वैवाहिक मंच।',
        quickLinks: 'त्वरित लिंक',
        browseBy: 'खोजें',
        support: 'सहायता',
        aboutUs: 'हमारे बारे में',
        premiumPlans: 'प्रीमियम योजनाएं',
        contactUs: 'संपर्क करें',
        rashi: 'राशि / नक्षत्र',
        cityState: 'शहर / राज्य',
        profession: 'पेशे',
        helpCenter: 'सहायता केंद्र',
        safetyTips: 'सुरक्षा युक्तियाँ',
        privacyPolicy: 'गोपनीयता नीति',
        terms: 'सेवा की शर्तें',
        copyright: '© 2026 रुक्मिणी स्वयंवर। सर्वाधिकार सुरक्षित। भारत में 🙏 और दिव्य आशीर्वाद के साथ निर्मित'
      },
      mr: {
        title: 'रुक्मिणी',
        subtitle: 'स्वयंवर',
        mantra: 'ॐ श्री कृष्णाय नमः',
        tagline: 'जिथे दैवी प्रेम पवित्र बंधनांना प्रेरणा देते',
        description: 'The divine union of two souls',
        ctaPrimary: 'तुमचा प्रवास सुरू करा',
        ctaSecondary: 'प्रोफाइल पाहा',
        login: 'लॉगइन',
        register: 'नोंदणी',
        backHome: 'मुख्य पानावर परत जा',
        loginWelcome: 'पुन्हा स्वागत आहे',
        emailLabel: 'ईमेल पत्ता',
        passwordLabel: 'पासवर्ड',
        continueGoogle: 'Google सह पुढे जा',
        regWelcome: 'आमच्या पवित्र समुदायात सामील व्हा',
        mobileLabel: 'मोबाइल क्रमांक',
        profileLabel: 'प्रोफाइल कोणासाठी नोंदणी करत आहात',
        registerMe: 'आता नोंदणी करा',
        statsProfiles: 'पवित्र प्रोफाइल',
        statsUnions: 'दैवी बंधन',
        statsCommunities: 'समुदाय',
        searchHeading: 'तुमचा शोध सुरू करा',
        searchSubheading: 'तुमचा नियोजित जोडीदार शोधा',
        labelLookingFor: 'शोधत आहे',
        labelAgeRange: 'वयोगट',
        labelGotra: 'गोत्र / समुदाय',
        labelMotherTongue: 'मातृभाषा',
        placeholderSelect: 'निवडा',
        searchBtn: 'प्रोफाईल्स शोधा',
        howHeading: 'रुक्मिणी स्वयंवर कसे काम करते',
        step1Title: 'पवित्र प्रोफाइल शोधा',
        step1Desc: 'आमच्या धन्य समुदायात आणि परंपरांमध्ये जीवनसाथी कोण शोधत आहे ते पहा.',
        step1Link: 'प्रोफाइल आणि गट शोधा',
        step2Title: 'तुमचा दैवी जोडीदार शोधा',
        step2Desc: 'सामायिक मूल्ये, ज्योतिषशास्त्रीय सुसंगतता आणि कौटुंबिक परंपरांवर आधारित नाते जोडा.',
        step3Title: 'तुमचा पवित्र प्रवास सुरू करा',
        step3Desc: 'तुमचा नियोजित जीवनसाथी शोधा आणि लाखो लोकांच्या समुदायाकडून आशीर्वाद मिळवा.',
        step3Link: 'प्रवास सुरू करा',
        successHeading: 'यशस्वी कहाण्या',
        successSubheading: 'धन्य बंधन',
        successDesc: 'खरे कुटुंब, खरे आशीर्वाद — आमच्या सुखी विवाहित जोड्यांकडून ऐका',
        story1Quote: 'भगवान कृष्णाच्या कृपेने, आम्ही रुक्मिणी स्वयंवरवर एकमेकांना भेटलो. कुंडली मिलान अचूक होते!',
        story1Names: 'नेहा आणि अमित',
        story1Loc: 'मुंबई',
        story1Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        story2Quote: 'या व्यासपीठामध्ये अंतर्भूत पारंपरिक मूल्यांनी आमच्या पालकांना खूप आत्मविश्वास दिला. आम्ही आमच्या जीवनसाथीला भेटलो.',
        story2Names: 'कविता आणि सुरेश',
        story2Loc: 'चेन्नई',
        story2Photo: 'https://i.pinimg.com/1200x/0f/0b/4e/0f0b4eaa59bfe3e10bf5f5e29bfb5711.jpg',
        story3Quote: 'ज्याने आम्हाला प्रभावित केले ते होते विवाहासाठी पवित्र दृष्टिकोन. कोणताही शॉर्टकट नाही, फक्त खरे प्रोफाइल आणि दैवी मार्गदर्शन.',
        story3Names: 'सिमरन आणि राजवीर',
        story3Loc: 'जयपूर',
        story3Photo: 'https://i.pinimg.com/1200x/74/97/0e/74970e9f546671db9ad6abe0c6cb6814.jpg',
        story4Quote: 'आमच्या कुटुंब ऑनलाइन मैचिंग होते होते, परंतु रुक्मिणी स्वयंवर ने त्यांचा दाखून घेतले. आम्ही दिव्य प्रेमासह असले साबित केले.',
        story4Names: 'प्रिया आणि करण',
        story4Loc: 'कोलकाता',
        story4Photo: 'https://i.pinimg.com/1200x/d9/67/fa/d967fab897594e60516dd983463af7b5.jpg',
        loveStoryHeading: 'एक दैवी वारसा',
        loveStoryQuote: 'जेव्हा श्रद्धेने धैर्याची आणि नियतीने प्रेमाची निवड केली, तेव्हा रुक्मिणीचा स्वयंवर ही हृदयाची विजयगाथा ठरली.',
        krishnaLoveQuote: 'मी सर्व प्राणिमात्रांसाठी समान आहे; माझे प्रेम सदैव समान असते.',
        ctaFinalHeading: 'तुमचा दैवी जोडीदार शोधण्यासाठी तयार आहात का?',
        ctaFinalBtn: 'आता नोंदणी करा — हे विनामूल्य आहे',
        footerDesc: 'भगवान श्रीकृष्ण आणि देवी रुक्मिणी यांच्या दैवी प्रेमाने आशीर्वादित. भारताचे सर्वात पवित्र वैवाहिक व्यासपीठ.',
        quickLinks: 'जलद दुवे',
        browseBy: 'शोधा',
        support: 'सहकार्य',
        aboutUs: 'आमच्याबद्दल',
        premiumPlans: 'प्रीमियम योजना',
        contactUs: 'संपर्क साधा',
        rashi: 'राशी / नक्षत्र',
        cityState: 'शहर / राज्य',
        profession: 'व्यवसाय',
        helpCenter: 'मदत केंद्र',
        safetyTips: 'सुरक्षा टिप्स',
        privacyPolicy: 'गोपनीयता धोरण',
        terms: 'सेवा अटी',
        copyright: '© 2026 रुक्मिणी स्वयंवर. सर्व हक्क राखीव. भारतात 🙏 आणि दैवी आशीर्वादाने निर्मित'
      }
    };

  t = this.translations[this.currentLang];

  constructor(
    private router: Router,
    private location: Location
  ) {
    // Sync URL with view state
    this.syncUrlWithView();
  }

  ngOnInit(): void {
    // Check initial URL and set view accordingly
    this.checkInitialRoute();
  }

  private syncUrlWithView(): void {
    // Listen to URL changes
    this.router.events.subscribe(() => {
      const path = this.location.path();
      this.updateViewFromUrl(path);
    });
  }

  private checkInitialRoute(): void {
    const path = this.location.path();
    this.updateViewFromUrl(path);
  }

  private updateViewFromUrl(path: string): void {
    if (path === '/privacy-policy') {
      this.currentView = 'privacy-policy';
    } else if (path === '/login' || path === '') {
      this.currentView = 'login';
    } else if (path === '/register') {
      this.currentView = 'register';
    } else if (path === '/dashboard') {
      this.currentView = 'dashboard';
    } else if (path === '/reported-blocked-users') {
      this.currentView = 'reported-blocked-users';
    } else if (path === '/welcome') {
      this.currentView = 'welcome';
    }
    // Add more path mappings as needed
  }

  setLanguage(lang: 'en' | 'hi' | 'mr') {
    this.currentLang = lang;
    this.t = this.translations[lang];
  }

  openProfileDetail(profileId: number) {
    this.selectedProfileId = profileId;
    this.setView('profile-detail');
  }

  setView(view: ViewState) {
    if (this.currentView !== view) {
      this.previousView = this.currentView;
    }
    this.currentView = view;

    // Update URL when view changes
    this.updateUrlFromView(view);
  }

  private updateUrlFromView(view: ViewState): void {
    const urlMap: Record<ViewState, string> = {
      'home': '/',
      'login': '/login',
      'register': '/register',
      'email-otp': '/email-otp',
      'set-password': '/set-password',
      'profile-form': '/profile-form',
      'dashboard': '/dashboard',
      'settings': '/settings',
      'notification-settings': '/notification-settings',
      'change-password': '/change-password',
      'privacy-settings': '/privacy-settings',
      'reported-blocked-users': '/reported-blocked-users',
      'language': '/language',
      'messages': '/messages',
      'chat-detail': '/chat-detail',
      'favorites': '/favorites',
      'profile-detail': '/profile-detail',
      'notifications': '/notifications',
      'welcome': '/welcome',
      'partner-preferences': '/partner-preferences',
      'photo-gallery': '/photo-gallery',
      'privacy-policy': '/privacy-policy'
    };

    const url = urlMap[view] || '/';
    this.location.go(url);
  }
}
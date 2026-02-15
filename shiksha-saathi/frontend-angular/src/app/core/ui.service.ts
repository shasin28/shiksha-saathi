import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'en' | 'hi';

const COPY: Record<AppLanguage, Record<string, string>> = {
  en: {
    appName: 'Shiksha Saathi',
    dashboard: 'Dashboard',
    studentTest: 'Student Test',
    teacherDashboard: 'Teacher Dashboard',
    adminDashboard: 'Admin Dashboard',
    logout: 'Logout',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    voiceFirst: 'Voice-first Learning Platform',
    loginSubtitle: 'Angular UI with route-based dashboards, ASR capture, and admin controls.',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    signingIn: 'Signing in...',
    useSeeded: 'Use seeded credentials for admin, teacher, or student.',
    credsRequired: 'Email and password required.',
    checkingCreds: 'Checking credentials...',
    loginFailed: 'Login failed. Check credentials.',
    roleOverview: 'Role-aware overview and quick workspace routes.',
    students: 'Students',
    attempts: 'Attempts',
    voiceShare: 'Voice Share',
    offlineShare: 'Offline Share',
    testingRoute: 'Testing Route',
    testingRouteDesc: 'Capture ASR attempts and sync offline queue.',
    openStudentTest: 'Open Student Test',
    workspace: 'Workspace',
    workspaceAdminDesc: 'Admin controls for classes, sections, and students.',
    workspaceTeacherDesc: 'Teacher controls for misconceptions and worksheets.',
    openWorkspace: 'Open Workspace',
    studentWelcome: 'Welcome. Continue to your books and ask doubts with AI tutor.',
    studentLibrary: 'Student Library',
    studentLibraryDesc: 'Access Bihar board books class-wise and subject-wise.',
    openLibrary: 'Open Library',
    loginAs: 'Login As',
    teacherAdmin: 'Teacher/Admin',
    student: 'Student',
    usernameOrEmail: 'Username or Email',
    studentHint: 'Student demo: rekha / student123 (or student 123)',
    libraryTitle: 'Bihar Board Library',
    chooseClass: 'Choose Class',
    classLabel: 'Class',
    chooseSubject: 'Choose Subject',
    allSubjects: 'All Subjects',
    math: 'Math',
    science: 'Science',
    socialScience: 'Social Science',
    askAi: 'Ask AI Tutor',
    askPlaceholder: 'Type your question from this chapter',
    getAnswer: 'Get Answer',
    selectBookFirst: 'Select a book first.',
    questionRequired: 'Question is required.',
    aiAnswer: 'AI Answer',
    availableBooks: 'Available Books',
    openPdf: 'Open PDF',
    noBooks: 'No books found for this filter.',
    notePdf: 'If a PDF does not open, place that file under backend/library path.',
    aiUnavailable: 'Unable to answer right now.',
    asrLowConnectivity: 'ASR capture with local queue for low-connectivity usage.',
    division: 'Division',
    multiplication: 'Multiplication',
    fractions: 'Fractions',
    decimals: 'Decimals',
    hindi: 'Hindi',
    english: 'English',
    marathi: 'Marathi',
    startRecording: 'Start Recording',
    saveAsrAttempt: 'Save ASR Attempt',
    syncQueue: 'Sync Queue',
    transcriptPlaceholder: 'Speech transcript appears here',
    offlineQueue: 'Offline Queue',
    eventsPending: 'events pending',
    studentGapReport: 'Student Gap Report',
    loadGaps: 'Load Gaps',
    accuracy: 'Accuracy',
    latency: 'Latency',
    readyToCapture: 'Ready to capture.',
    srUnavailable: 'SpeechRecognition unavailable. Type transcript manually.',
    listening: 'Listening...',
    transcriptRequired: 'Transcript required.',
    savedOffline: 'Saved offline.',
    offlinePostponed: 'Offline. Sync postponed.',
    queueSynced: 'Queue synced.',
    transcriptCaptured: 'Transcript captured.',
    asrError: 'ASR error. Retry or type transcript.',
    analyzeMisconceptions: 'Analyze misconceptions and generate remedial worksheets.',
    section: 'Section',
    analyzeClass: 'Analyze Class',
    analyzeSection: 'Analyze Section',
    generateWorksheet: 'Generate Worksheet',
    worksheet: 'Worksheet',
    errorRate: 'Error',
    avgLatency: 'Avg latency',
    createClass: 'Create Class',
    className: 'Class name',
    createSection: 'Create Section',
    addStudent: 'Add Student',
    studentName: 'Student name',
    languageCode: 'Language code',
    addStudentBtn: 'Add Student',
    ready: 'Ready.',
    classCreatedReload: 'Class created. Reloading class lists...',
    sectionCreated: 'Section created.',
    studentAdded: 'Student added.',
    createTeacher: 'Create Teacher',
    teacherName: 'Teacher name',
    teacherEmail: 'Teacher email',
    teacherPassword: 'Teacher password',
    teacherCreated: 'Teacher created.',
    studentCreds: 'Student Credentials',
    username: 'Username',
    temporaryPassword: 'Temporary password',
    sharedOverview: 'Shared Overview',
    role: 'Role',
    grade: 'Grade',
    quickActions: 'Quick Actions',
    highRiskGaps: 'High Risk Gaps',
    remedialFeedback: 'AI Remedial Feedback',
    rating: 'Rating',
    mastery: 'Mastery',
    prepPlan: 'Prep Plan',
    feedbackSource: 'Source'
  },
  hi: {
    appName: 'शिक्षा साथी',
    dashboard: 'डैशबोर्ड',
    studentTest: 'विद्यार्थी टेस्ट',
    teacherDashboard: 'शिक्षक डैशबोर्ड',
    adminDashboard: 'एडमिन डैशबोर्ड',
    logout: 'लॉग आउट',
    language: 'भाषा',
    theme: 'थीम',
    light: 'लाइट',
    dark: 'डार्क',
    voiceFirst: 'वॉइस-फर्स्ट लर्निंग प्लेटफ़ॉर्म',
    loginSubtitle: 'रूट-आधारित डैशबोर्ड, ASR कैप्चर और एडमिन कंट्रोल के साथ Angular UI।',
    email: 'ईमेल',
    password: 'पासवर्ड',
    login: 'लॉगिन',
    signingIn: 'साइन इन हो रहा है...',
    useSeeded: 'एडमिन, शिक्षक या विद्यार्थी के seeded credentials उपयोग करें।',
    credsRequired: 'ईमेल और पासवर्ड आवश्यक हैं।',
    checkingCreds: 'क्रेडेंशियल जाँचे जा रहे हैं...',
    loginFailed: 'लॉगिन असफल। क्रेडेंशियल जाँचें।',
    roleOverview: 'भूमिका-आधारित ओवरव्यू और त्वरित वर्कस्पेस रूट।',
    students: 'विद्यार्थी',
    attempts: 'प्रयास',
    voiceShare: 'वॉइस शेयर',
    offlineShare: 'ऑफलाइन शेयर',
    testingRoute: 'टेस्टिंग रूट',
    testingRouteDesc: 'ASR प्रयास कैप्चर करें और ऑफलाइन कतार सिंक करें।',
    openStudentTest: 'विद्यार्थी टेस्ट खोलें',
    workspace: 'वर्कस्पेस',
    workspaceAdminDesc: 'कक्षा, सेक्शन और विद्यार्थियों के लिए एडमिन कंट्रोल।',
    workspaceTeacherDesc: 'भ्रम विश्लेषण और वर्कशीट के लिए शिक्षक कंट्रोल।',
    openWorkspace: 'वर्कस्पेस खोलें',
    studentWelcome: 'स्वागत है। अपनी किताबें खोलें और AI ट्यूटर से सवाल पूछें।',
    studentLibrary: 'विद्यार्थी लाइब्रेरी',
    studentLibraryDesc: 'बिहार बोर्ड की किताबें कक्षा और विषय अनुसार देखें।',
    openLibrary: 'लाइब्रेरी खोलें',
    loginAs: 'लॉगिन प्रकार',
    teacherAdmin: 'शिक्षक/एडमिन',
    student: 'विद्यार्थी',
    usernameOrEmail: 'यूज़रनेम या ईमेल',
    studentHint: 'डेमो विद्यार्थी: rekha / student123 (या student 123)',
    libraryTitle: 'बिहार बोर्ड लाइब्रेरी',
    chooseClass: 'कक्षा चुनें',
    classLabel: 'कक्षा',
    chooseSubject: 'विषय चुनें',
    allSubjects: 'सभी विषय',
    math: 'गणित',
    science: 'विज्ञान',
    socialScience: 'सामाजिक विज्ञान',
    askAi: 'AI ट्यूटर से पूछें',
    askPlaceholder: 'इस अध्याय से अपना प्रश्न लिखें',
    getAnswer: 'उत्तर पाएं',
    selectBookFirst: 'पहले एक पुस्तक चुनें।',
    questionRequired: 'प्रश्न आवश्यक है।',
    aiAnswer: 'AI उत्तर',
    availableBooks: 'उपलब्ध पुस्तकें',
    openPdf: 'PDF खोलें',
    noBooks: 'इस फ़िल्टर के लिए पुस्तकें नहीं मिलीं।',
    notePdf: 'यदि PDF न खुले तो फाइल backend/library path में रखें।',
    aiUnavailable: 'अभी उत्तर उपलब्ध नहीं है।',
    asrLowConnectivity: 'कम नेटवर्क में लोकल कतार के साथ ASR कैप्चर।',
    division: 'भाग',
    multiplication: 'गुणा',
    fractions: 'भिन्न',
    decimals: 'दशमलव',
    hindi: 'हिंदी',
    english: 'अंग्रेज़ी',
    marathi: 'मराठी',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    saveAsrAttempt: 'ASR प्रयास सेव करें',
    syncQueue: 'कतार सिंक करें',
    transcriptPlaceholder: 'बोली गई ट्रांसक्रिप्ट यहाँ दिखेगी',
    offlineQueue: 'ऑफलाइन कतार',
    eventsPending: 'इवेंट लंबित',
    studentGapReport: 'विद्यार्थी गैप रिपोर्ट',
    loadGaps: 'गैप लोड करें',
    accuracy: 'सटीकता',
    latency: 'विलंब',
    readyToCapture: 'कैप्चर के लिए तैयार।',
    srUnavailable: 'SpeechRecognition उपलब्ध नहीं। ट्रांसक्रिप्ट मैन्युअली लिखें।',
    listening: 'सुन रहा है...',
    transcriptRequired: 'ट्रांसक्रिप्ट आवश्यक है।',
    savedOffline: 'ऑफलाइन सेव किया गया।',
    offlinePostponed: 'ऑफलाइन। सिंक बाद में होगा।',
    queueSynced: 'कतार सिंक हो गई।',
    transcriptCaptured: 'ट्रांसक्रिप्ट कैप्चर हो गई।',
    asrError: 'ASR त्रुटि। फिर प्रयास करें या मैन्युअली लिखें।',
    analyzeMisconceptions: 'भ्रम का विश्लेषण करें और remedial worksheet बनाएं।',
    section: 'सेक्शन',
    analyzeClass: 'कक्षा विश्लेषण',
    analyzeSection: 'सेक्शन विश्लेषण',
    generateWorksheet: 'वर्कशीट बनाएं',
    worksheet: 'वर्कशीट',
    errorRate: 'त्रुटि',
    avgLatency: 'औसत विलंब',
    createClass: 'कक्षा बनाएं',
    className: 'कक्षा का नाम',
    createSection: 'सेक्शन बनाएं',
    addStudent: 'विद्यार्थी जोड़ें',
    studentName: 'विद्यार्थी का नाम',
    languageCode: 'भाषा कोड',
    addStudentBtn: 'विद्यार्थी जोड़ें',
    ready: 'तैयार।',
    classCreatedReload: 'कक्षा बन गई। सूची रीफ्रेश हो रही है...',
    sectionCreated: 'सेक्शन बन गया।',
    studentAdded: 'विद्यार्थी जोड़ दिया गया।',
    createTeacher: 'शिक्षक बनाएं',
    teacherName: 'शिक्षक का नाम',
    teacherEmail: 'शिक्षक ईमेल',
    teacherPassword: 'शिक्षक पासवर्ड',
    teacherCreated: 'शिक्षक बन गया।',
    studentCreds: 'विद्यार्थी क्रेडेंशियल',
    username: 'यूज़रनेम',
    temporaryPassword: 'अस्थायी पासवर्ड',
    sharedOverview: 'साझा अवलोकन',
    role: 'भूमिका',
    grade: 'कक्षा',
    quickActions: 'त्वरित कार्य',
    highRiskGaps: 'उच्च जोखिम गैप',
    remedialFeedback: 'AI उपचारात्मक फीडबैक',
    rating: 'रेटिंग',
    mastery: 'मास्टरी',
    prepPlan: 'तैयारी योजना',
    feedbackSource: 'स्रोत'
  }
};

@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly themeKey = 'shiksha_theme';
  private readonly langKey = 'shiksha_lang';

  private readonly themeSubject = new BehaviorSubject<AppTheme>(this.readTheme());
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.readLanguage());

  readonly theme$ = this.themeSubject.asObservable();
  readonly language$ = this.languageSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
    this.applyLanguage(this.languageSubject.value);
  }

  get theme(): AppTheme {
    return this.themeSubject.value;
  }

  get language(): AppLanguage {
    return this.languageSubject.value;
  }

  setTheme(theme: AppTheme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.themeKey, theme);
    this.applyTheme(theme);
  }

  setLanguage(language: AppLanguage): void {
    this.languageSubject.next(language);
    localStorage.setItem(this.langKey, language);
    this.applyLanguage(language);
  }

  t(key: string): string {
    return COPY[this.language][key] || COPY.en[key] || key;
  }

  private readTheme(): AppTheme {
    const stored = localStorage.getItem(this.themeKey);
    return stored === 'dark' ? 'dark' : 'light';
  }

  private readLanguage(): AppLanguage {
    const stored = localStorage.getItem(this.langKey);
    return stored === 'hi' ? 'hi' : 'en';
  }

  private applyTheme(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private applyLanguage(language: AppLanguage): void {
    document.documentElement.setAttribute('lang', language);
  }
}

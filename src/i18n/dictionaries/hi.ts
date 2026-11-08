import type { Dictionary } from '../translate'

/**
 * हिन्दी — Hindi. Names are written in Devanagari; the venue keeps its official
 * name. Guest-facing phrasing avoids gendered first-person verb forms.
 */
export const hi: Dictionary = {
  meta: {
    title: 'दर्शन और वत्सला — विवाह निमंत्रण',
    description:
      'दर्शन और वत्सला के विवाह समारोह में आप सादर आमंत्रित हैं — 15 और 16 नवंबर 2026, बापूजी समुदाय भवन, दावणगेरे। दो परिवार। एक सुंदर सफ़र।',
  },

  couple: {
    first: 'दर्शन',
    second: 'वत्सला',
    joiner: 'संग',
    and: 'संग',
    pair: 'दर्शन और वत्सला',
    pairAnd: 'दर्शन और वत्सला',
  },

  tagline: {
    full: 'दो परिवार। एक सुंदर सफ़र।',
    first: 'दो परिवार।',
    second: 'एक सुंदर सफ़र।',
  },

  venue: {
    name: 'बापूजी समुदाय भवन',
    line1: 'शामनूर रोड, सिद्धवीरप्पा लेआउट',
    line2: 'शामनूर, दावणगेरे',
    line3: 'कर्नाटक 577004, भारत',
    city: 'दावणगेरे',
  },

  days: {
    'day-1': 'पहला दिन',
    'day-2': 'दूसरा दिन',
  },

  common: {
    newTab: '(नए टैब में खुलेगा)',
    mapsNewTab: '(गूगल मैप्स नए टैब में खुलेगा)',
    toBeAnnounced: 'शीघ्र घोषित किया जाएगा',
    timeToBeAnnounced: 'समय शीघ्र घोषित किया जाएगा',
    close: 'बंद करें',
  },

  language: {
    label: 'भाषा',
    choose: 'भाषा चुनें',
    current: 'भाषा: {name}',
  },

  nav: {
    home: 'मुख्य पृष्ठ',
    invitation: 'निमंत्रण',
    calendar: 'कैलेंडर',
    celebrations: 'उत्सव',
    rsvp: 'जवाब दें',
    primary: 'मुख्य नेविगेशन',
    openMenu: 'मेनू खोलें',
    closeMenu: 'मेनू बंद करें',
    siteNavigation: 'साइट नेविगेशन',
    backToTop: '{pairAnd} — ऊपर लौटें',
    skipToInvitation: 'सीधे निमंत्रण पर जाएँ',
  },

  intro: {
    welcome: '{pairAnd} के विवाह में आपका स्वागत है',
    enter: 'विवाह मंडप में पधारें',
    skip: 'परिचय छोड़ें',
  },

  hero: {
    eyebrow: 'शुभ विवाह',
    open: 'निमंत्रण खोलें',
    scrollCue: 'निमंत्रण की ओर बढ़ें',
    sceneUnavailable: '3D दृश्य उपलब्ध नहीं है; स्थिर चित्र दिखाया जा रहा है।',
  },

  motion: {
    pause: 'एनिमेशन रोकें',
    play: 'एनिमेशन चलाएँ',
  },

  invitation: {
    eyebrow: 'निमंत्रण',
    titleLine: 'प्रेम की मुहर लगा',
    titleScript: 'एक पत्र',
    intro: 'रिबन खोलिए और हमारा निमंत्रण पढ़ने के लिए यह पत्र खोलिए।',
    blessings: 'हमारे परिवारों के आशीर्वाद से',
    heading: 'आप सादर आमंत्रित हैं',
    toCelebrate: 'शुभ विवाह समारोह',
    twoDays: 'दो दिनों का उत्सव',
    message: 'हर्षित हृदय से हम आपके स्वागत की प्रतीक्षा में हैं। आपकी उपस्थिति हमारे इन विशेष दिनों को और भी सार्थक बना देगी।',
    signoff: 'सप्रेम',
    open: 'अपना निमंत्रण खोलें',
    rollUp: 'निमंत्रण लपेटें',
  },

  calendar: {
    eyebrow: 'ये तिथियाँ याद रखें',
    titlePre: 'जीवंत',
    titleScript: 'विवाह',
    titlePost: 'कैलेंडर',
    intro: 'हमारा विवाह उत्सव दो दिनों तक चलेगा। विवरण देखने के लिए कोई एक दिन चुनें।',
    tabs: 'विवाह के दिन',
    today: 'आज',
    day: 'दिन',
    days: 'दिन',
    toGo: 'शेष',
    hours: 'घंटे',
    minutes: 'मिनट',
    seconds: 'सेकंड',
    srCountdown: '{date} के आरंभ तक (भारतीय मानक समय) {days} दिन, {hours} घंटे और {minutes} मिनट शेष।',
    srCountdownTimed: '{date} को {time} तक {days} दिन, {hours} घंटे और {minutes} मिनट शेष।',
    dateBasedNote: '{date} के आरंभ तक (भारतीय मानक समय, IST) तिथि-आधारित उलटी गिनती। समारोह का समय तय होते ही बताया जाएगा।',
    timedNote: '{time} (IST) तक की उलटी गिनती।',
    todayMessage: 'उत्सव आज है! आपके साथ होने से हमें अपार खुशी है।',
    beginsAt: '{time} पर आरंभ — {hours} घं {minutes} मि में।',
    pastDay: 'इस दिन का उत्सव संपन्न हो चुका है।',
    continuesToday: 'उत्सव आज भी जारी है।',
    postEvent: 'हमारे साथ उत्सव मनाने के लिए प्रेम और आभार सहित धन्यवाद।',
    viewSchedule: 'इस दिन का समारोह देखें',
  },

  celebrations: {
    eyebrow: 'विवाह उत्सव',
    title: '*सांझ* से\n*भोर* तक',
    fromTime: '{time} से',
    timeRange: '{start} से {end} तक',
    addToCalendar: 'कैलेंडर में जोड़ें',
    googleCalendar: 'गूगल कैलेंडर',
    icsFile: 'ऐपल / आउटलुक (.ics)',
    icsBoth: 'दोनों दिन (.ics)',
    icsDone: 'कैलेंडर फ़ाइल डाउनलोड हो गई — उसे खोलकर अपने कैलेंडर में जोड़ें।',
    google: 'गूगल · {date}',
    venueTitle: 'विवाह स्थल',
    address: 'पता:',
    asOnMaps: 'गूगल मैप्स के अनुसार:',
    getDirections: 'रास्ता देखें',
    copyAddress: 'पता कॉपी करें',
    addressCopied: 'पता कॉपी हो गया',
    copiedNote: 'पूरा पता आपके क्लिपबोर्ड पर है।',
    copyFailed: 'यहाँ कॉपी करना संभव नहीं — कृपया ऊपर दिया पता चुनें।',
    showMap: 'नक्शे का पूर्वावलोकन दिखाएँ',
    hideMap: 'नक्शे का पूर्वावलोकन छिपाएँ',
    mapNote: 'नक्शे का पूर्वावलोकन गूगल से तभी लोड होगा जब आप उसे दिखाना चुनेंगे।',
    mapTitle: '{venue}, {city} दिखाता गूगल नक्शा',
    artNote: 'सड़कें © OpenStreetMap योगदानकर्ता; इमारतें, पेड़ और वाहन सांकेतिक हैं। लाइव रास्ते के लिए “रास्ता देखें” का उपयोग करें।',
    routeFrom: 'दावणगेरे रेलवे स्टेशन से',
    routeStation: 'रेलवे स्टेशन',
    routeSummary: '{km} किमी · कार से लगभग {min} मिनट',
    replayRoute: 'रास्ता फिर से दिखाएँ',
    mapAlt: 'दावणगेरे का 3D नक्शा: रेलवे स्टेशन से हदडी रोड, विद्यानगर रोड, बीआईईटी रोड और शामनूर रोड होते हुए बापूजी समुदाय भवन तक का रास्ता — 6.1 किमी, कार से लगभग 8 मिनट।',
    guestsTitle: 'अतिथियों के लिए',
    call: 'परिवार को कॉल करें',
    callSr: 'कॉल करें',
    share: 'निमंत्रण साझा करें',
  },

  places: {
    hadadiRoad: 'हदडी रोड',
    vidhyanagarRoad: 'विद्यानगर रोड',
    bietRoad: 'बीआईईटी रोड',
    shamanurRoad: 'शामनूर रोड',
    vinobanagara: 'विनोबानगर',
    kbExtension: 'के.बी. एक्सटेंशन',
    ktJambannaNagara: 'के.टी. जंबन्ना नगर',
  },

  share: {
    title: '{pair} — आप सादर आमंत्रित हैं',
    text: '{pairAnd} के विवाह समारोह में आप सादर आमंत्रित हैं — {dates}, {venue}, {city}।',
    shared: 'निमंत्रण साझा करने के लिए धन्यवाद।',
    copied: 'निमंत्रण का लिंक आपके क्लिपबोर्ड पर कॉपी हो गया।',
    failed: 'यहाँ साझा करना संभव नहीं — कृपया एड्रेस बार से लिंक कॉपी करें।',
  },

  rsvp: {
    closingScript: 'प्रेम और आशीर्वाद सहित',
    closing:
      'इन विशेष पलों को आपके साथ मनाकर हमें अपार प्रसन्नता होगी। आपका आशीर्वाद, स्नेह और उपस्थिति हमारे उत्सव को पूर्ण बनाएँगे।',
    cardEyebrow: 'उत्तर पत्र',
    cardTitle: 'कृपया हमें बताएँ',
    respondBy: 'कृपया {date} तक उत्तर दें।',
    how: 'आपका उत्तर **व्हाट्सऐप** पर परिवार {number} तक पहुँचता है। संदेश तैयार होकर खुलेगा — पुष्टि के लिए वहाँ **भेजें (Send) दबाएँ**।',
    checkForm: 'कृपया फ़ॉर्म जाँचें:',
    name: 'आपका नाम',
    namePlaceholder: 'पूरा नाम',
    nameError: 'कृपया अपना नाम लिखें।',
    attendLegend: 'क्या आप पधारेंगे?',
    accepts: 'सहर्ष स्वीकार',
    declines: 'सखेद अस्वीकार',
    attendError: 'कृपया बताएँ कि आप आ पाएँगे या नहीं।',
    guests: 'आपको मिलाकर आने वालों की संख्या',
    optional: '(वैकल्पिक)',
    guestsPlaceholder: 'जैसे 2',
    guestsError: 'कृपया 1 से {max} तक की पूर्ण संख्या लिखें, या खाली छोड़ दें।',
    send: 'व्हाट्सऐप से जवाब भेजें',
    opening: 'व्हाट्सऐप खुल रहा है…',
    ready: 'आपका व्हाट्सऐप संदेश तैयार है। जवाब की पुष्टि के लिए कृपया भेजें (Send) दबाएँ।',
    readyBlocked: 'आपका व्हाट्सऐप संदेश तैयार है।',
    readyNote: 'व्हाट्सऐप में भेजने पर ही आपका जवाब परिवार तक पहुँचेगा।',
    blockedNote: 'आपके ब्राउज़र ने व्हाट्सऐप को अपने-आप खुलने नहीं दिया। नीचे से खोलें, फिर पुष्टि के लिए भेजें (Send) दबाएँ।',
    openAgain: 'व्हाट्सऐप नहीं खुला? फिर से खोलें',
    openWhatsApp: 'व्हाट्सऐप खोलें',
    privacy: 'आपका विवरण केवल उस व्हाट्सऐप संदेश में जाता है जिसे आप भेजते हैं। यह वेबसाइट इसे सहेजती नहीं है।',
    backToTop: 'शुरुआत पर लौटें',
  },

  rsvpMessage: {
    heading: 'विवाह निमंत्रण का उत्तर — {pair}',
    greeting: 'नमस्ते! {pairAnd} के विवाह के लिए मेरा उत्तर इस प्रकार है।',
    name: 'नाम: {name}',
    attendance: 'उपस्थिति: {value}',
    attendees: 'आने वालों की संख्या: {count}',
    dates: 'विवाह की तिथियाँ: {dates}',
    venue: 'स्थल: {venue}, {city}',
    wishes: '{pairAnd} को उनके विवाह उत्सव के लिए हार्दिक शुभकामनाएँ।',
    thanks: 'धन्यवाद।',
    and: 'और',
  },

  calendarFile: {
    summary: '{pairAnd} का विवाह उत्सव — {day}',
    description: '{pairAnd} का विवाह उत्सव — {day}।',
    schedulePending: 'कार्यक्रम का विवरण शीघ्र ही दिया जाएगा।',
    beginsAt: '{time} पर आरंभ।',
    venue: 'स्थल: {address}',
    directions: 'रास्ता: {url}',
  },

  footer: {
    credit: '{pairAnd} के लिए प्रेम से बनाया गया। मंडप और उत्सव के दृश्य कलात्मक 3D चित्रण हैं, तस्वीरें नहीं।',
  },

  music: {
    trackTitle: 'मंगल ध्वनि',
    trackSubtitle: '{pairAnd} के लिए रचित मौलिक वाद्य-संगीत',
    button: 'संगीत',
    panel: 'संगीत',
    play: 'संगीत चलाएँ',
    pause: 'संगीत रोकें',
    mute: 'आवाज़ बंद करें',
    unmute: 'आवाज़ चालू करें',
    volume: 'आवाज़ का स्तर',
    loading: 'संगीत लोड हो रहा है…',
    playing: 'बज रहा है',
    paused: 'रुका हुआ',
    error: 'अभी संगीत लोड नहीं हो सका।',
    retry: 'फिर से कोशिश करें',
    blocked: 'आपके ब्राउज़र ने संगीत रोक दिया — शुरू करने के लिए "संगीत चलाएँ" दबाएँ।',
    deviceVolume: 'आवाज़ का स्तर अपने डिवाइस के बटनों से बदलें।',
    close: 'संगीत नियंत्रण बंद करें',
  },

  clock: {
    am: 'पूर्वाह्न',
    pm: 'अपराह्न',
  },
}

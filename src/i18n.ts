// i18n - Lightweight localization system

// Single source of truth for available locales
export const AVAILABLE_LOCALES = [
  { code: 'en' as const, name: 'English' },
  { code: 'ru' as const, name: 'Русский' },
  { code: 'fr' as const, name: 'Français' },
  { code: 'es' as const, name: 'Español' },
  { code: 'de' as const, name: 'Deutsch' },
] as const;

export type Locale = typeof AVAILABLE_LOCALES[number]['code'];

const VALID_LOCALES = new Set<string>(AVAILABLE_LOCALES.map(l => l.code));

export interface Translations {
  // Default script
  defaultScript: string;

  // Control labels
  script: string;
  font: string;
  fontSize: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: string;
  letterSpacing: string;
  scrollSpeed: string;
  maxWordsPerLine: string;
  flipScreen: string;
  flipVertical: string;
  language: string;

  // Buttons
  flip: string;
  unflip: string;
  play: string;
  pause: string;
  cancel: string;
  backToTop: string;
  close: string;

  // Units
  px: string;
  linesPerSec: string;

  // Accessibility
  toggleFullscreen: string;
  helpKeyboardShortcuts: string;

  // Help modal
  helpTitle: string;
  keyboardShortcuts: string;
  features: string;
  tipsForBestResults: string;

  // Shortcuts descriptions
  shortcutPlayPause: string;
  shortcutScrollSpeed: string;
  shortcutNavigateLines: string;
  shortcutFontSize: string;
  shortcutLineSpacing: string;
  shortcutShowHelp: string;
  shortcutCloseDialog: string;

  // Feature labels (bold headers)
  labelAutoSave: string;
  labelCountdown: string;
  labelSmoothRamping: string;
  labelFlipMode: string;
  labelFullscreen: string;
  labelCustomization: string;
  labelWordLimit: string;
  labelWorksOffline: string;

  // Features descriptions
  featureAutoSave: string;
  featureCountdown: string;
  featureSmoothRamping: string;
  featureFlipMode: string;
  featureFullscreen: string;
  featureCustomization: string;
  featureWordLimit: string;
  featureWorksOffline: string;

  // Tips
  tipFontSize: string;
  tipLineSpacing: string;
  tipScrollSpeed: string;
  tipFlipMode: string;
  tipFlipVertical: string;
  tipPractice: string;

  // Footer
  footerText: string;
  viewOnGitHub: string;

  // Error messages
  fullscreenError: string;

  // New UI elements
  edit: string;
  editScript: string;
  saveAndClose: string;
  settings: string;
  display: string;
  typography: string;
  general: string;
  closeDrawer: string;

  // Speed control accessibility
  decreaseSpeed: string;
  increaseSpeed: string;

  // Editor char count
  chars: string;
  words: string;
  lines: string;

  // Duration estimation
  estimatedDuration: string;
  minutes: string;
  seconds: string;

  // Reading guide
  readingGuide: string;
  readingGuideDescription: string;

  // Cue points
  cuePointAdded: string;
  cuePointRemoved: string;
  noCuePoints: string;
  shortcutToggleCuePoint: string;
  shortcutJumpToCuePoint: string;

  // Import/Export
  importScript: string;
  exportScript: string;
}

const translations: Record<Locale, Translations> = {
  en: {
    defaultScript: `Welcome to the Teleprompter App!

This is a sample text.
You can edit this text and customize how it appears.

Use the controls below to adjust font, colors, spacing, and scroll speed.

Press the Play button to start scrolling.`,

    script: 'Script',
    font: 'Font',
    fontSize: 'Font Size',
    fontColor: 'Font Color',
    backgroundColor: 'Background Color',
    lineSpacing: 'Line Spacing',
    letterSpacing: 'Letter Spacing',
    scrollSpeed: 'Scroll Speed',
    maxWordsPerLine: 'Max Words/Line',
    flipScreen: 'Flip Horizontal',
    flipVertical: 'Flip Vertical',
    language: 'Language',

    flip: 'Flip',
    unflip: 'Unflip',
    play: 'Play',
    pause: 'Pause',
    cancel: 'Cancel',
    backToTop: 'Back to Top',
    close: 'Close',

    px: 'px',
    linesPerSec: 'lines/sec',

    toggleFullscreen: 'Toggle Fullscreen',
    helpKeyboardShortcuts: 'Help & Keyboard Shortcuts',

    helpTitle: 'Teleprompter Help',
    keyboardShortcuts: 'Keyboard Shortcuts',
    features: 'Features',
    tipsForBestResults: 'Tips for Best Results',

    shortcutPlayPause: 'Play / Pause / Cancel',
    shortcutScrollSpeed: 'Adjust scroll speed',
    shortcutNavigateLines: 'Navigate lines (when paused)',
    shortcutFontSize: 'Adjust font size',
    shortcutLineSpacing: 'Adjust line spacing',
    shortcutShowHelp: 'Show this help',
    shortcutCloseDialog: 'Close dialog',

    labelAutoSave: 'Auto-save',
    labelCountdown: 'Countdown',
    labelSmoothRamping: 'Smooth ramping',
    labelFlipMode: 'Flip mode',
    labelFullscreen: 'Fullscreen',
    labelCustomization: 'Customization',
    labelWordLimit: 'Word limit',
    labelWorksOffline: 'Works offline',

    featureAutoSave: 'Your script is automatically saved to your browser',
    featureCountdown: '3-2-1 countdown before scrolling starts',
    featureSmoothRamping: 'Gradual speed up/down for natural reading',
    featureFlipMode: 'Mirror text for beam splitter teleprompters',
    featureFullscreen: 'Distraction-free reading mode',
    featureCustomization: 'Adjust fonts, colors, spacing, and speed',
    featureWordLimit: 'Set max words per line for better readability',
    featureWorksOffline: 'No internet connection required after loading',

    tipFontSize: 'Use a larger font size (40-60px) for comfortable reading from a distance',
    tipLineSpacing: 'Increase line spacing (1.5-2x) to make it easier to track your place',
    tipScrollSpeed: 'Set scroll speed to match your natural reading pace',
    tipFlipMode: 'Mirror horizontally for beam splitter setups',
    tipFlipVertical: 'Mirror vertically for overhead monitor setups',
    tipPractice: 'Practice a few times before recording to find your ideal settings',

    footerText: 'Free Online Teleprompter · No account required',
    viewOnGitHub: 'View on GitHub',

    fullscreenError: 'Error attempting to enable full-screen mode',

    edit: 'Edit',
    editScript: 'Edit Script',
    saveAndClose: 'Save & Close',
    settings: 'Settings',
    display: 'Display',
    typography: 'Typography',
    general: 'General',
    closeDrawer: 'Close',

    decreaseSpeed: 'Decrease speed',
    increaseSpeed: 'Increase speed',

    chars: 'chars',
    words: 'words',
    lines: 'lines',

    estimatedDuration: 'Est. Duration',
    minutes: 'min',
    seconds: 'sec',

    readingGuide: 'Reading Guide',
    readingGuideDescription: 'Dims text outside focus area for easier tracking',

    cuePointAdded: 'Cue point added',
    cuePointRemoved: 'Cue point removed',
    noCuePoints: 'No cue points',
    shortcutToggleCuePoint: 'Toggle cue point (when paused)',
    shortcutJumpToCuePoint: 'Jump to prev/next cue point',

    importScript: 'Import',
    exportScript: 'Export',
  },

  ru: {
    defaultScript: `Добро пожаловать в приложение Телепромптер!

Это пример текста.
Вы можете редактировать этот текст и настраивать его отображение.

Используйте элементы управления ниже для настройки шрифта, цветов, интервалов и скорости прокрутки.

Нажмите кнопку Воспроизвести, чтобы начать прокрутку.`,

    script: 'Текст',
    font: 'Шрифт',
    fontSize: 'Размер шрифта',
    fontColor: 'Цвет шрифта',
    backgroundColor: 'Цвет фона',
    lineSpacing: 'Межстрочный интервал',
    letterSpacing: 'Межбуквенный интервал',
    scrollSpeed: 'Скорость прокрутки',
    maxWordsPerLine: 'Макс. слов в строке',
    flipScreen: 'Отразить по горизонтали',
    flipVertical: 'Отразить по вертикали',
    language: 'Язык',

    flip: 'Отразить',
    unflip: 'Вернуть',
    play: 'Пуск',
    pause: 'Пауза',
    cancel: 'Отмена',
    backToTop: 'В начало',
    close: 'Закрыть',

    px: 'px',
    linesPerSec: 'строк/сек',

    toggleFullscreen: 'Полноэкранный режим',
    helpKeyboardShortcuts: 'Справка и горячие клавиши',

    helpTitle: 'Справка по телепромптеру',
    keyboardShortcuts: 'Горячие клавиши',
    features: 'Функции',
    tipsForBestResults: 'Советы для лучших результатов',

    shortcutPlayPause: 'Пуск / Пауза / Отмена',
    shortcutScrollSpeed: 'Регулировка скорости прокрутки',
    shortcutNavigateLines: 'Навигация по строкам (на паузе)',
    shortcutFontSize: 'Регулировка размера шрифта',
    shortcutLineSpacing: 'Регулировка межстрочного интервала',
    shortcutShowHelp: 'Показать эту справку',
    shortcutCloseDialog: 'Закрыть диалог',

    labelAutoSave: 'Автосохранение',
    labelCountdown: 'Отсчёт',
    labelSmoothRamping: 'Плавный старт',
    labelFlipMode: 'Зеркало',
    labelFullscreen: 'Полный экран',
    labelCustomization: 'Настройка',
    labelWordLimit: 'Лимит слов',
    labelWorksOffline: 'Офлайн',

    featureAutoSave: 'Ваш текст автоматически сохраняется в браузере',
    featureCountdown: 'Обратный отсчёт 3-2-1 перед началом прокрутки',
    featureSmoothRamping: 'Плавное ускорение/замедление для естественного чтения',
    featureFlipMode: 'Зеркальное отображение текста для телепромптеров с расщепителем луча',
    featureFullscreen: 'Полноэкранный режим без отвлекающих факторов',
    featureCustomization: 'Настройка шрифтов, цветов, интервалов и скорости',
    featureWordLimit: 'Установка максимального количества слов в строке для лучшей читаемости',
    featureWorksOffline: 'После загрузки интернет-соединение не требуется',

    tipFontSize: 'Используйте крупный шрифт (40-60px) для комфортного чтения на расстоянии',
    tipLineSpacing: 'Увеличьте межстрочный интервал (1.5-2x), чтобы легче следить за текстом',
    tipScrollSpeed: 'Установите скорость прокрутки в соответствии с вашим темпом чтения',
    tipFlipMode: 'Зеркало по горизонтали для расщепителя луча',
    tipFlipVertical: 'Зеркало по вертикали для верхнего монитора',
    tipPractice: 'Попрактикуйтесь несколько раз перед записью, чтобы найти идеальные настройки',

    footerText: 'Бесплатный онлайн телепромптер · Без регистрации',
    viewOnGitHub: 'Смотреть на GitHub',

    fullscreenError: 'Ошибка при включении полноэкранного режима',

    edit: 'Редактировать',
    editScript: 'Редактировать текст',
    saveAndClose: 'Сохранить',
    settings: 'Настройки',
    display: 'Отображение',
    typography: 'Типографика',
    general: 'Общие',
    closeDrawer: 'Закрыть',

    decreaseSpeed: 'Уменьшить скорость',
    increaseSpeed: 'Увеличить скорость',

    chars: 'символов',
    words: 'слов',
    lines: 'строк',

    estimatedDuration: 'Расч. длительность',
    minutes: 'мин',
    seconds: 'сек',

    readingGuide: 'Направляющая чтения',
    readingGuideDescription: 'Затемняет текст вне зоны фокуса',

    cuePointAdded: 'Метка добавлена',
    cuePointRemoved: 'Метка удалена',
    noCuePoints: 'Нет меток',
    shortcutToggleCuePoint: 'Метка (на паузе)',
    shortcutJumpToCuePoint: 'К пред./след. метке',

    importScript: 'Импорт',
    exportScript: 'Экспорт',
  },

  fr: {
    defaultScript: `Bienvenue dans l'application Téléprompteur !

Ceci est un texte d'exemple.
Vous pouvez modifier ce texte et personnaliser son apparence.

Utilisez les contrôles ci-dessous pour ajuster la police, les couleurs, l'espacement et la vitesse de défilement.

Appuyez sur le bouton Lecture pour commencer le défilement.`,

    script: 'Script',
    font: 'Police',
    fontSize: 'Taille de police',
    fontColor: 'Couleur du texte',
    backgroundColor: 'Couleur de fond',
    lineSpacing: 'Interligne',
    letterSpacing: 'Espacement des lettres',
    scrollSpeed: 'Vitesse de défilement',
    maxWordsPerLine: 'Mots max/ligne',
    flipScreen: 'Miroir horizontal',
    flipVertical: 'Miroir vertical',
    language: 'Langue',

    flip: 'Miroir',
    unflip: 'Normal',
    play: 'Lecture',
    pause: 'Pause',
    cancel: 'Annuler',
    backToTop: 'Retour en haut',
    close: 'Fermer',

    px: 'px',
    linesPerSec: 'lignes/sec',

    toggleFullscreen: 'Plein écran',
    helpKeyboardShortcuts: 'Aide et raccourcis clavier',

    helpTitle: 'Aide du téléprompteur',
    keyboardShortcuts: 'Raccourcis clavier',
    features: 'Fonctionnalités',
    tipsForBestResults: 'Conseils pour de meilleurs résultats',

    shortcutPlayPause: 'Lecture / Pause / Annuler',
    shortcutScrollSpeed: 'Ajuster la vitesse de défilement',
    shortcutNavigateLines: 'Naviguer entre les lignes (en pause)',
    shortcutFontSize: 'Ajuster la taille de police',
    shortcutLineSpacing: 'Ajuster l\'interligne',
    shortcutShowHelp: 'Afficher cette aide',
    shortcutCloseDialog: 'Fermer la boîte de dialogue',

    labelAutoSave: 'Sauvegarde auto',
    labelCountdown: 'Compte à rebours',
    labelSmoothRamping: 'Démarrage doux',
    labelFlipMode: 'Mode miroir',
    labelFullscreen: 'Plein écran',
    labelCustomization: 'Personnalisation',
    labelWordLimit: 'Limite de mots',
    labelWorksOffline: 'Hors ligne',

    featureAutoSave: 'Votre script est automatiquement sauvegardé dans votre navigateur',
    featureCountdown: 'Compte à rebours 3-2-1 avant le défilement',
    featureSmoothRamping: 'Accélération/décélération progressive pour une lecture naturelle',
    featureFlipMode: 'Texte en miroir pour les téléprompteurs à séparateur de faisceau',
    featureFullscreen: 'Mode de lecture sans distraction',
    featureCustomization: 'Ajustez les polices, couleurs, espacement et vitesse',
    featureWordLimit: 'Définir un nombre max de mots par ligne pour une meilleure lisibilité',
    featureWorksOffline: 'Aucune connexion internet requise après le chargement',

    tipFontSize: 'Utilisez une grande taille de police (40-60px) pour une lecture confortable à distance',
    tipLineSpacing: 'Augmentez l\'interligne (1.5-2x) pour faciliter le suivi du texte',
    tipScrollSpeed: 'Réglez la vitesse de défilement selon votre rythme de lecture naturel',
    tipFlipMode: 'Miroir horizontal pour séparateur de faisceau',
    tipFlipVertical: 'Miroir vertical pour moniteur en hauteur',
    tipPractice: 'Entraînez-vous plusieurs fois avant l\'enregistrement pour trouver vos réglages idéaux',

    footerText: 'Téléprompteur en ligne gratuit · Sans inscription',
    viewOnGitHub: 'Voir sur GitHub',

    fullscreenError: 'Erreur lors de l\'activation du mode plein écran',

    edit: 'Éditer',
    editScript: 'Éditer le script',
    saveAndClose: 'Enregistrer',
    settings: 'Paramètres',
    display: 'Affichage',
    typography: 'Typographie',
    general: 'Général',
    closeDrawer: 'Fermer',

    decreaseSpeed: 'Réduire la vitesse',
    increaseSpeed: 'Augmenter la vitesse',

    chars: 'caractères',
    words: 'mots',
    lines: 'lignes',

    estimatedDuration: 'Durée est.',
    minutes: 'min',
    seconds: 'sec',

    readingGuide: 'Guide de lecture',
    readingGuideDescription: 'Atténue le texte hors de la zone de focus',

    cuePointAdded: 'Point de repère ajouté',
    cuePointRemoved: 'Point de repère supprimé',
    noCuePoints: 'Aucun point de repère',
    shortcutToggleCuePoint: 'Point de repère (en pause)',
    shortcutJumpToCuePoint: 'Aller au repère préc./suiv.',

    importScript: 'Importer',
    exportScript: 'Exporter',
  },

  es: {
    defaultScript: `¡Bienvenido a la aplicación Teleprompter!

Este es un texto de ejemplo.
Puedes editar este texto y personalizar cómo aparece.

Usa los controles de abajo para ajustar la fuente, colores, espaciado y velocidad de desplazamiento.

Presiona el botón Reproducir para comenzar el desplazamiento.`,

    script: 'Guión',
    font: 'Fuente',
    fontSize: 'Tamaño de fuente',
    fontColor: 'Color de fuente',
    backgroundColor: 'Color de fondo',
    lineSpacing: 'Interlineado',
    letterSpacing: 'Espaciado de letras',
    scrollSpeed: 'Velocidad',
    maxWordsPerLine: 'Máx. palabras/línea',
    flipScreen: 'Espejo horizontal',
    flipVertical: 'Espejo vertical',
    language: 'Idioma',

    flip: 'Espejo',
    unflip: 'Normal',
    play: 'Iniciar',
    pause: 'Pausa',
    cancel: 'Cancelar',
    backToTop: 'Volver arriba',
    close: 'Cerrar',

    px: 'px',
    linesPerSec: 'líneas/seg',

    toggleFullscreen: 'Pantalla completa',
    helpKeyboardShortcuts: 'Ayuda y atajos de teclado',

    helpTitle: 'Ayuda del Teleprompter',
    keyboardShortcuts: 'Atajos de teclado',
    features: 'Características',
    tipsForBestResults: 'Consejos para mejores resultados',

    shortcutPlayPause: 'Reproducir / Pausa / Cancelar',
    shortcutScrollSpeed: 'Ajustar velocidad de desplazamiento',
    shortcutNavigateLines: 'Navegar líneas (en pausa)',
    shortcutFontSize: 'Ajustar tamaño de fuente',
    shortcutLineSpacing: 'Ajustar interlineado',
    shortcutShowHelp: 'Mostrar esta ayuda',
    shortcutCloseDialog: 'Cerrar diálogo',

    labelAutoSave: 'Autoguardado',
    labelCountdown: 'Cuenta atrás',
    labelSmoothRamping: 'Inicio suave',
    labelFlipMode: 'Modo espejo',
    labelFullscreen: 'Pantalla completa',
    labelCustomization: 'Personalización',
    labelWordLimit: 'Límite de palabras',
    labelWorksOffline: 'Sin conexión',

    featureAutoSave: 'Tu guión se guarda automáticamente en tu navegador',
    featureCountdown: 'Cuenta regresiva 3-2-1 antes de comenzar',
    featureSmoothRamping: 'Aceleración/desaceleración gradual para lectura natural',
    featureFlipMode: 'Texto en espejo para teleprompters con divisor de haz',
    featureFullscreen: 'Modo de lectura sin distracciones',
    featureCustomization: 'Ajusta fuentes, colores, espaciado y velocidad',
    featureWordLimit: 'Establece máximo de palabras por línea para mejor legibilidad',
    featureWorksOffline: 'No se requiere conexión a internet después de cargar',

    tipFontSize: 'Usa un tamaño de fuente grande (40-60px) para lectura cómoda a distancia',
    tipLineSpacing: 'Aumenta el interlineado (1.5-2x) para facilitar el seguimiento del texto',
    tipScrollSpeed: 'Ajusta la velocidad de desplazamiento a tu ritmo natural de lectura',
    tipFlipMode: 'Espejo horizontal para divisor de haz',
    tipFlipVertical: 'Espejo vertical para monitor elevado',
    tipPractice: 'Practica varias veces antes de grabar para encontrar tu configuración ideal',

    footerText: 'Teleprompter en línea gratuito · Sin registro',
    viewOnGitHub: 'Ver en GitHub',

    fullscreenError: 'Error al activar el modo de pantalla completa',

    edit: 'Editar',
    editScript: 'Editar guión',
    saveAndClose: 'Guardar',
    settings: 'Ajustes',
    display: 'Pantalla',
    typography: 'Tipografía',
    general: 'General',
    closeDrawer: 'Cerrar',

    decreaseSpeed: 'Reducir velocidad',
    increaseSpeed: 'Aumentar velocidad',

    chars: 'caracteres',
    words: 'palabras',
    lines: 'líneas',

    estimatedDuration: 'Duración est.',
    minutes: 'min',
    seconds: 'seg',

    readingGuide: 'Guía de lectura',
    readingGuideDescription: 'Atenúa el texto fuera del área de enfoque',

    cuePointAdded: 'Marcador añadido',
    cuePointRemoved: 'Marcador eliminado',
    noCuePoints: 'Sin marcadores',
    shortcutToggleCuePoint: 'Marcador (en pausa)',
    shortcutJumpToCuePoint: 'Ir al marcador ant./sig.',

    importScript: 'Importar',
    exportScript: 'Exportar',
  },

  de: {
    defaultScript: `Willkommen bei der Teleprompter-App!

Dies ist ein Beispieltext.
Sie können diesen Text bearbeiten und sein Aussehen anpassen.

Verwenden Sie die Steuerelemente unten, um Schriftart, Farben, Abstände und Scrollgeschwindigkeit anzupassen.

Drücken Sie die Wiedergabe-Taste, um das Scrollen zu starten.`,

    script: 'Skript',
    font: 'Schriftart',
    fontSize: 'Schriftgröße',
    fontColor: 'Schriftfarbe',
    backgroundColor: 'Hintergrundfarbe',
    lineSpacing: 'Zeilenabstand',
    letterSpacing: 'Buchstabenabstand',
    scrollSpeed: 'Scrollgeschwindigkeit',
    maxWordsPerLine: 'Max. Wörter/Zeile',
    flipScreen: 'Horizontal spiegeln',
    flipVertical: 'Vertikal spiegeln',
    language: 'Sprache',

    flip: 'Spiegeln',
    unflip: 'Normal',
    play: 'Start',
    pause: 'Pause',
    cancel: 'Abbrechen',
    backToTop: 'Nach oben',
    close: 'Schließen',

    px: 'px',
    linesPerSec: 'Zeilen/Sek',

    toggleFullscreen: 'Vollbild umschalten',
    helpKeyboardShortcuts: 'Hilfe & Tastenkürzel',

    helpTitle: 'Teleprompter-Hilfe',
    keyboardShortcuts: 'Tastenkürzel',
    features: 'Funktionen',
    tipsForBestResults: 'Tipps für beste Ergebnisse',

    shortcutPlayPause: 'Wiedergabe / Pause / Abbrechen',
    shortcutScrollSpeed: 'Scrollgeschwindigkeit anpassen',
    shortcutNavigateLines: 'Zeilen navigieren (bei Pause)',
    shortcutFontSize: 'Schriftgröße anpassen',
    shortcutLineSpacing: 'Zeilenabstand anpassen',
    shortcutShowHelp: 'Diese Hilfe anzeigen',
    shortcutCloseDialog: 'Dialog schließen',

    labelAutoSave: 'Auto-Speichern',
    labelCountdown: 'Countdown',
    labelSmoothRamping: 'Sanfter Start',
    labelFlipMode: 'Spiegelmodus',
    labelFullscreen: 'Vollbild',
    labelCustomization: 'Anpassung',
    labelWordLimit: 'Wortlimit',
    labelWorksOffline: 'Offline',

    featureAutoSave: 'Ihr Skript wird automatisch im Browser gespeichert',
    featureCountdown: '3-2-1 Countdown vor dem Scrollen',
    featureSmoothRamping: 'Sanftes Beschleunigen/Verlangsamen für natürliches Lesen',
    featureFlipMode: 'Gespiegelter Text für Strahlteiler-Teleprompter',
    featureFullscreen: 'Ablenkungsfreier Lesemodus',
    featureCustomization: 'Schriftarten, Farben, Abstände und Geschwindigkeit anpassen',
    featureWordLimit: 'Maximale Wörter pro Zeile für bessere Lesbarkeit festlegen',
    featureWorksOffline: 'Nach dem Laden keine Internetverbindung erforderlich',

    tipFontSize: 'Verwenden Sie eine größere Schriftgröße (40-60px) für bequemes Lesen aus der Entfernung',
    tipLineSpacing: 'Erhöhen Sie den Zeilenabstand (1,5-2x), um den Text leichter zu verfolgen',
    tipScrollSpeed: 'Stellen Sie die Scrollgeschwindigkeit auf Ihr natürliches Lesetempo ein',
    tipFlipMode: 'Horizontal spiegeln für Strahlteiler',
    tipFlipVertical: 'Vertikal spiegeln für Overhead-Monitor',
    tipPractice: 'Üben Sie einige Male vor der Aufnahme, um Ihre idealen Einstellungen zu finden',

    footerText: 'Kostenloser Online-Teleprompter · Ohne Anmeldung',
    viewOnGitHub: 'Auf GitHub ansehen',

    fullscreenError: 'Fehler beim Aktivieren des Vollbildmodus',

    edit: 'Bearbeiten',
    editScript: 'Skript bearbeiten',
    saveAndClose: 'Speichern',
    settings: 'Einstellungen',
    display: 'Anzeige',
    typography: 'Typografie',
    general: 'Allgemein',
    closeDrawer: 'Schließen',

    decreaseSpeed: 'Geschwindigkeit verringern',
    increaseSpeed: 'Geschwindigkeit erhöhen',

    chars: 'Zeichen',
    words: 'Wörter',
    lines: 'Zeilen',

    estimatedDuration: 'Gesch. Dauer',
    minutes: 'Min',
    seconds: 'Sek',

    readingGuide: 'Lesehilfe',
    readingGuideDescription: 'Dunkelt Text außerhalb des Fokusbereichs ab',

    cuePointAdded: 'Markierung hinzugefügt',
    cuePointRemoved: 'Markierung entfernt',
    noCuePoints: 'Keine Markierungen',
    shortcutToggleCuePoint: 'Markierung (bei Pause)',
    shortcutJumpToCuePoint: 'Zur vor./nächsten Markierung',

    importScript: 'Importieren',
    exportScript: 'Exportieren',
  },
};

const LOCALE_STORAGE_KEY = 'tpt/locale';

class I18n {
  private currentLocale: Locale;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.currentLocale = this.detectLocale();
  }

  private detectLocale(): Locale {
    // Check localStorage first (with error handling for Safari private mode)
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved && this.isValidLocale(saved)) {
        return saved as Locale;
      }
    } catch {
      // localStorage not available (private browsing, etc.)
    }

    // Detect from browser
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    if (this.isValidLocale(browserLang)) {
      return browserLang as Locale;
    }

    return 'en';
  }

  private isValidLocale(locale: string): locale is Locale {
    return VALID_LOCALES.has(locale);
  }

  get locale(): Locale {
    return this.currentLocale;
  }

  setLocale(locale: Locale): void {
    if (this.currentLocale !== locale) {
      this.currentLocale = locale;
      // Save with error handling
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // localStorage not available or quota exceeded
      }
      this.notifyListeners();
    }
  }

  t<K extends keyof Translations>(key: K): Translations[K] {
    return translations[this.currentLocale][key];
  }

  // Get all available locales with their display names
  getAvailableLocales(): ReadonlyArray<{ code: Locale; name: string }> {
    return AVAILABLE_LOCALES;
  }

  // Subscribe to locale changes
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }
}

// Singleton instance
export const i18n = new I18n();

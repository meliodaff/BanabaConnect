import { Platform } from 'react-native';

/** The tab screens, by path. Any other path is a screen opened on top of the tabs. */
export const TAB_ROUTES = ['/', '/reports', '/hotlines', '/profile'] as const;

export type TutorialRoute = (typeof TAB_ROUTES)[number] | '/report';

export interface TutorialStep {
  id: string;
  /** The screen the step happens on. */
  route: TutorialRoute;
  /** TourTarget ids to point at, the first one found wins. None: a card in the middle. */
  target?: string[];
  /** The resident taps the highlighted button to go on (Next still works). */
  advanceOn?: 'tap';
  /** Skipped when its part isn't on the screen, e.g. a setting only Android has. */
  optional?: boolean;
  title: string;
  body: string;
  /** The same as `body`, in Tagalog, shown right under it. */
  bodyTagalog: string;
}

/**
 * The tutorial, in order. It points at real buttons but never sends a report, an SOS, or makes a
 * call: only the Report tab button can be tapped, and it just opens the first step of a report.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    route: '/',
    title: 'Learn the app in about a minute',
    body: 'This tour points at the real buttons, one at a time. Nothing is sent and no one is called.',
    bodyTagalog: 'Ituturo ng tour ang mga totoong button, isa-isa. Walang ipapadala at walang tatawagan.',
  },
  {
    id: 'report',
    route: '/',
    target: ['home-report'],
    title: 'Report an emergency',
    body: 'Choose what is happening and send it to the barangay. With no signal, the report waits on your phone and sends when signal comes back.',
    bodyTagalog: 'Piliin kung ano ang nangyayari at ipadala sa barangay. Kapag walang signal, maghihintay ang report sa phone mo at ipapadala pagbalik ng signal.',
  },
  {
    id: 'sos',
    route: '/',
    target: ['home-sos'],
    title: 'SOS when you can’t explain',
    body: 'Sends your location to the barangay and calls 911. Use it when you can’t type or say what is happening.',
    bodyTagalog: 'Ipapadala ang location mo sa barangay at tatawag sa 911. Gamitin kapag hindi ka makapag-type o hindi masabi kung ano ang nangyayari.',
  },
  {
    id: 'reportTab',
    route: '/',
    target: ['tab-report'],
    advanceOn: 'tap',
    title: 'The Report button is always here',
    body: 'It’s at the bottom of every tab. Tap it now to see the first step. Nothing is sent.',
    bodyTagalog: 'Nasa ibaba ito ng bawat tab. I-tap ngayon para makita ang unang hakbang. Walang ipapadala.',
  },
  {
    id: 'categories',
    route: '/report',
    target: ['report-categories'],
    title: 'Choose what is happening',
    body: 'Next, you can add details and a photo. The report is sent only when you tap Send report.',
    bodyTagalog: 'Pagkatapos, puwede kang magdagdag ng detalye at litrato. Maipapadala lang ang report kapag tinap mo ang Send report.',
  },
  {
    id: 'myReports',
    route: '/reports',
    target: ['reports-first', 'reports-empty'],
    title: 'Your reports',
    body: 'Each report shows if it is waiting for signal, sent, or what the barangay is doing about it.',
    bodyTagalog: 'Makikita sa bawat report kung naghihintay ng signal, naipadala na, o ano na ang ginagawa ng barangay.',
  },
  {
    id: 'hotlines',
    route: '/hotlines',
    target: ['hotlines-list'],
    title: 'Hotlines',
    body: 'Tap a number to call. Calls use your regular phone signal, so they can work without mobile data.',
    bodyTagalog: 'I-tap ang numero para tumawag. Regular na signal ang gamit, kaya puwede kahit walang mobile data.',
  },
  {
    id: 'account',
    route: '/profile',
    target: ['profile-account'],
    optional: true,
    title: 'Your account',
    body: 'Sign in and verify your Barangay ID here. Verified residents’ reports are given higher priority.',
    bodyTagalog: 'Mag-sign in at i-verify ang Barangay ID mo rito. Mas inuuna ang report ng mga verified na residente.',
  },
  // The same card as in Profile: the volume button on Android, Back Tap on iPhone.
  Platform.OS === 'ios'
    ? {
        id: 'quickSos',
        route: '/profile',
        target: ['profile-quick-sos'],
        optional: true,
        title: 'Open SOS by tapping your iPhone',
        body: 'Set it up here. Then tapping the back of your iPhone three times opens Send SOS.',
        bodyTagalog: 'I-set up ito rito. Pagkatapos, kapag tinapik nang tatlong beses ang likod ng iPhone, bubukas ang Send SOS.',
      }
    : {
        id: 'quickSos',
        route: '/profile',
        target: ['profile-quick-sos'],
        optional: true,
        title: 'SOS with the volume button',
        body: 'Set it up here. Then pressing volume down 5 times, fast, opens Send SOS, even when your phone is locked.',
        bodyTagalog: 'I-set up ito rito. Pagkatapos, kapag pinindot ang volume down nang 5 beses, mabilis, bubukas ang Send SOS kahit naka-lock ang phone.',
      },
  {
    id: 'finish',
    route: '/profile',
    target: ['profile-tutorial'],
    title: 'You’re ready',
    body: 'You can take this tour again anytime from here.',
    bodyTagalog: 'Puwede mong ulitin ang tour dito kahit kailan.',
  },
];

/** Shown on the step where the resident taps the real button. */
export const TAP_HINT = {
  english: 'Tap the highlighted button, or press Next.',
  tagalog: 'I-tap ang naka-highlight, o pindutin ang Next.',
};

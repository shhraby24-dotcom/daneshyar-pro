/**
 * دانش‌یار پرو - نقطه شروع (بهینه‌سازی موبایل + PWA)
 * @module main
 */
import './style.css';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getRouter } from '@/core/Router';
import { getLayout } from '@/ui/Layout';
import { createDashboardView } from '@/ui/views/DashboardView';
import { getDatabase } from '@/core/Database';
import { createAuthView } from '@/ui/views/AuthView';
import { syncAll } from '@/services/SyncService';
import { loadSubscription, getCurrentSubscription, isSubscriptionValid } from '@/services/SubscriptionService';
import { startTrial, hasUsedTrial, checkTrialExpiry, isTrialActive } from '@/services/TrialService';
import { getInstance as getLogger } from '@/core/Logger';
import { startAutoRewardWatcher } from '@/services/AutoRewardWatcher';
import { savePendingRef } from '@/services/ReferralService';
import { createLandingView } from '@/ui/views/LandingView';

const logger = getLogger({ level: 'DEBUG', showTimestamp: true, persistToStorage: false });
getEventBus({ debug: false });
const router = getRouter();

logger.info('Starting Daneshyar Pro...');

async function bootstrap(): Promise<void> {
  try {
    const hashQuery = window.location.hash.split('?')[1] ?? '';
    const refCode = new URLSearchParams(hashQuery).get('ref');
    if (refCode) savePendingRef(refCode);

    logger.info('Step 1: Prepare DOM');
    const app = document.createElement('div');
    app.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(app);

    logger.info('Step 2: Load State');
    await state.load();

    const hash = window.location.hash;
    const isLandingRoute = hash === '#/landing' |
| hash === '#/landing/';

    // New user without data -> direct render landing (no redirect = no blank screen)
    if (!hash || hash === '#' || hash === '#/' || hash === '') {
      const db = getDatabase();
      await db.init();
      const stats = await db.getStats();
      const hasData = stats.totalNotes > 0 || stats.totalFlashcards > 0 || stats.totalQuizzes > 0;
      if (!hasData) {
        const landingView = await createLandingView();
        app.appendChild(landingView);
        history.replaceState(null, '', '#/landing');
        logger.info('Landing rendered for new user');
        return;
      }
    }

    // Landing route: standalone (no Layout, no Router)
    if (isLandingRoute) {
      const landingView = await createLandingView();
      app.appendChild(landingView);
      logger.info('Landing page rendered (standalone)');
      return;
    }

    logger.info('Step 3: Render Layout');
    app.appendChild(getLayout().render());

    logger.info('Step 4: Register Views');
    router.setContainer('#main-content');
    registerViews();

    logger.info('Step 5: Start Router');
    await router.start();

    // Load subscription FIRST - this is the source of truth for paid subscriptions
    logger.info('Step 6: Load subscription from Supabase');
    try {
      await loadSubscription();
      logger.info('Subscription loaded successfully');
    } catch (subError) {
      logger.warn('Failed to load subscription (network error)', { error: subError });
      // Do NOT create fake subscription or auto-start trial on network error
    }

    // Only check trial AFTER subscription status is known
    // If we couldn't load subscription due to network error, don't auto-start trial
    const sub = getCurrentSubscription();
    if (sub === null) {
      // No paid subscription, check if user can start trial
      if (!hasUsedTrial() && !isTrialActive() && !isSubscriptionValid()) {
        startTrial();
        logger.info('Trial started for new user');
      }

    }

    // Start other services
    void syncAll();
    startAutoRewardWatcher();
    checkTrialExpiry();

    logger.info('Bootstrap completed successfully');
  } catch (error) {
    logger.error('Bootstrap failed', { error });
    // Show error to user
    const errorElement = document.createElement('div');
    errorElement.className = 'text-red-400 p-4 text-center';
    errorElement.textContent = 'خطایی رخ داده است. لطفا صفحه را مجددا بارگذاری کنید.';
    document.body.appendChild(errorElement);
  }
}

function registerViews(): void {
  const router = getRouter();
  // Register all views
  router.registerView('dashboard', () => createDashboardView());
  router.registerView('auth', () => createAuthView());
  // Other view registrations...
}

// Start the application
void bootstrap();

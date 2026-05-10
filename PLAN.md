# BibleAI Comprehensive Upgrade Plan

## 1. Database Schema Updates (Supabase)
- **Community Comments**: Add `community_post_comments` table.
- **Achievements**: Add `user_achievements` table.
- **Admin Role**: Add `is_admin` boolean to `profiles`.
- **Rate Limiting**: Add `rate_limits` table or use Redis/Edge function rate limiting.
- **Share Links**: Add `shared_verses` table to track custom share links.

## 2. Core Features
- **Verse Image Generation**: Enhance `ShareImageModal` to allow downloading and sharing to Instagram/Twitter.
- **Community Comments & Likes**: Update `Community.tsx` to support comments on posts.
- **Custom Share Links**: Create a new route `/share/:id` that displays a shared verse with OG meta tags.

## 3. PWA & Offline Support
- **Service Worker**: Update `sw.js` to cache Bible text, devotionals, and prayer entries using Workbox or custom caching strategies.
- **Manifest**: Ensure `manifest.json` is properly configured for PWA installation.

## 4. Admin Dashboard
- **Route**: Create `/admin` route protected by `is_admin` flag.
- **Analytics**: Track DAU, feature usage, popular verses.
- **Member Management**: Promote to Pro, revoke, ban, remove from DB, view IP.

## 5. Achievement Badges
- **Logic**: Implement logic to award badges ("First Prayer", "7-Day Streak", "100 Verses Read", "Community Contributor").
- **UI**: Display badges on the user profile/dashboard.

## 6. Context-Aware AI Chat
- **Edge Function**: Update `bible-chat` edge function to fetch user's bookmarks, reading plan, and faith level from `profiles`.
- **Prompt Engineering**: Inject this context into the system prompt.

## 7. Smart Verse Recommendations
- **AI Integration**: Use AI to analyze recent prayer entries and suggest relevant verses.

## 8. UI/UX Refinements
- **Accessibility (a11y)**: Add ARIA labels, keyboard navigation, focus rings.
- **Mobile-First**: Add bottom navigation bar, swipe gestures, pull-to-refresh.
- **Animations**: Add Framer Motion for page transitions, hover effects, animated counters.
- **Skeleton Loaders**: Replace loading spinners with shimmer effects.
- **Dark Mode**: Implement dark/light theme toggle persisted in `localStorage`.
- **Bible Reader**: Fix and enhance the Bible reader UI.

## 9. Deployment
- Commit all changes to GitHub.
- Deploy to Vercel.
- Apply Supabase migrations.

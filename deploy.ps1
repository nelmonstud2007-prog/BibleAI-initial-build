Write-Host "Building project..." -ForegroundColor Cyan
npm run build

Write-Host "Adding changes..." -ForegroundColor Cyan
git add .

Write-Host "Committing..." -ForegroundColor Cyan
git commit -m "auto deploy update"

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host "Deploying Supabase functions..." -ForegroundColor Cyan

supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy bible-chat
supabase functions deploy check-limits
supabase functions deploy daily-devotional

Write-Host "Deployment complete!" -ForegroundColor Green
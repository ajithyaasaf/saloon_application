pnpm dev
pnpm --filter @saloon/customer-mobile web
For database migration : pnpm --filter @saloon/database prisma:migrate:prod
to test on mobile expo : pnpm --filter @saloon/customer-mobile start:lan
to run backend server only : pnpm --filter @saloon/api dev

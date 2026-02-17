/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "LimitKey" AS ENUM ('SERVICES_ACTIVE_MAX', 'LINKS_ACTIVE_MAX', 'BOOKINGS_PER_MONTH_MAX');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "currentPeriodEndAt" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStartAt" TIMESTAMP(3),
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN     "theme" JSONB;

-- CreateTable
CREATE TABLE "PlanLimit" (
    "id" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "key" "LimitKey" NOT NULL,
    "valueInt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLimitOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" "LimitKey" NOT NULL,
    "deltaInt" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "yearMonth" TEXT,
    "reason" TEXT,
    "source" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLimitOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMonthlyUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "bookingsCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimit_planType_key_key" ON "PlanLimit"("planType", "key");

-- CreateIndex
CREATE INDEX "TenantLimitOverride_tenantId_key_expiresAt_idx" ON "TenantLimitOverride"("tenantId", "key", "expiresAt");

-- CreateIndex
CREATE INDEX "TenantMonthlyUsage_tenantId_yearMonth_idx" ON "TenantMonthlyUsage"("tenantId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMonthlyUsage_tenantId_yearMonth_key" ON "TenantMonthlyUsage"("tenantId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "TenantLimitOverride" ADD CONSTRAINT "TenantLimitOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMonthlyUsage" ADD CONSTRAINT "TenantMonthlyUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ActivationPlanType" AS ENUM ('FUN', 'EVENT');

-- CreateTable
CREATE TABLE "EventActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "planType" "ActivationPlanType" NOT NULL,
    "participantsLimit" INTEGER NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventActivation_userId_consumedAt_idx" ON "EventActivation"("userId", "consumedAt");

-- CreateIndex
CREATE INDEX "EventActivation_userId_planType_consumedAt_idx" ON "EventActivation"("userId", "planType", "consumedAt");

-- AddForeignKey
ALTER TABLE "EventActivation" ADD CONSTRAINT "EventActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventActivation" ADD CONSTRAINT "EventActivation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

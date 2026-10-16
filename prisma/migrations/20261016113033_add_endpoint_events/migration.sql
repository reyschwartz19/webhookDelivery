/*
  Warnings:

  - A unique constraint covering the columns `[eventId,endpointId]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Endpoint" ADD COLUMN     "subscribedEvents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_eventId_endpointId_key" ON "Delivery"("eventId", "endpointId");

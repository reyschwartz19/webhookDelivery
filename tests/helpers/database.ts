import prisma from "../../src/lib/prisma";

export const cleanDatabase = async () => {
    await prisma.deliveryAttempt.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.endpoint.deleteMany();
    await prisma.event.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
};
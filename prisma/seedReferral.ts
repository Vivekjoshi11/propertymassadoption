import { PrismaClient } from '@prisma/client';

import 'dotenv/config';

const prisma = new PrismaClient();

async function findByCode(referralCode: string) {
  const code = await prisma.referralCode.findUnique({
    where: {
      code: referralCode,
    },
  });
  return code;
}

async function generateUniqueReferralCode() {
  const allowedCharacters = 'ABCDEFGHJKLMNPQRSTUVWXY23456789';
  let randomCode = '';

  do {
    randomCode = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * allowedCharacters.length);
      randomCode += allowedCharacters.charAt(randomIndex);
    }
  } while (await findByCode(randomCode));

  return randomCode;
}

async function seed() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const userRef = await prisma.referralCode.findMany({
      where: {
        ownedBy: {
          id: user.id,
        },
      },
    });

    if (userRef.length === 0) {
      const randomCode = await generateUniqueReferralCode();

      const referralCode = await prisma.referralCode.create({
        data: {
          code: randomCode,
          ownedBy: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    }
  }
}

seed();

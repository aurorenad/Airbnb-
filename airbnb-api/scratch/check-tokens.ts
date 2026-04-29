import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function check() {
  const user = await prisma.user.findFirst({
    where: { resetToken: { not: null } },
    select: { email: true, resetToken: true, resetTokenExpiry: true }
  });
  console.log("User with reset token:", JSON.stringify(user, null, 2));
}

check().catch(console.error);

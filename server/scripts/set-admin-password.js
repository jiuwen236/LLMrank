const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setAdminPassword() {
  try {
    // Prompt for password
    const password = await new Promise(resolve => {
      rl.question('Enter admin password: ', answer => {
        resolve(answer);
      });
    });

    if (!password || password.length < 6) {
      console.log('Password must be at least 6 characters long.');
      return;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Delete existing admin passwords and create new one
    await prisma.adminPassword.deleteMany();
    await prisma.adminPassword.create({
      data: {
        password: hashedPassword,
      },
    });

    console.log('Admin password has been set successfully!');
  } catch (error) {
    console.error('Error setting admin password:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

setAdminPassword();

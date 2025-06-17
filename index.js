import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

dotenv.config();

const email = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASS;

const getVerificationCode = async () => {
  const config = {
    imap: {
      user: email,
      password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 3000,
    },
  };

  const connection = await imaps.connect(config);
  await connection.openBox('INBOX');

  const searchCriteria = ['UNSEEN'];
  const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

  const messages = await connection.search(searchCriteria, fetchOptions);

  for (const item of messages) {
    const all = item.parts.find(part => part.which === 'TEXT');
    const parsed = await simpleParser(all.body);
    const match = parsed.text.match(/\b\d{5}\b/);
    if (match) {
      connection.end();
      return match[0];
    }
  }

  connection.end();
  return null;
};

const run = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.freecallerregistry.com/fcr/#submitform');

  // Example fill (use real data and await page.type(...) for each field)
  await page.type('#enterprise_phone_0', '1234567890');
  await page.type('#enterprise_displayName_0', 'Company Caller');
  await page.type('#enterprise_contact_name', 'John Kent');
  await page.type('#enterprise_contact_email', email);
  await page.click('#send-verification-code');

  console.log('Waiting for verification code...');
  const code = await getVerificationCode();

  if (code) {
    await page.type('#captcha', code);
    console.log('Verification code submitted:', code);
  } else {
    console.log('Verification code not found in inbox.');
  }
};

run();

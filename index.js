import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

dotenv.config();

const email = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASS;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getVerificationCode = async () => {
  const config = {
    imap: {
      user: email,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 3000,
    },
  };

  console.log('⏳ Waiting 15 seconds before checking inbox...');
  await delay(15000);

  const connection = await imaps.connect(config);
  await connection.openBox('INBOX');

  const maxAttempts = 5;
  const searchCriteria = ['UNSEEN'];
  const fetchOptions = { bodies: [''], markSeen: false };

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`📨 Checking inbox... Attempt ${i + 1}`);
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`📦 Found ${messages.length} message(s)`);

    const recent = messages.slice(-1);
    for (const item of recent) {
      try {
        const raw = item.parts?.[0]?.body || '';
        const parsed = await simpleParser(raw);
        const from = parsed.from?.text || 'undefined';
        const subject = parsed.subject || 'undefined';
        const bodyText = parsed.text || '';

        console.log(`📧 From: ${from}`);
        console.log(`📌 Subject: ${subject}`);
        console.log(`✉️ Body Preview:\n${bodyText.slice(0, 300)}...`);

        if (from.includes('no-reply@tnsi.com')) {
          const match = subject.match(/\b\d{5}\b/) || bodyText.match(/\b\d{5}\b/);
          if (match) {
            console.log('✅ Code found:', match[0]);
            await connection.end();
            return match[0];
          }
        } else {
          console.log('❌ Sender does not match no-reply@tnsi.com');
        }
      } catch (err) {
        console.log('⚠️ Error parsing email:', err.message);
      }
    }

    console.log('⏳ Waiting 3 seconds before next attempt...');
    await delay(3000);
  }

  await connection.end();
  console.log('❌ No verification code found.');
  return null;
};

const startAutomation = async (attempt = 1) => {
  console.log(`\n⚙️ Starting Automation Attempt ${attempt}...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      slowMo: 100,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--start-maximized',
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.goto('https://www.freecallerregistry.com/fcr/#', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await page.waitForSelector('#nextButton', { visible: true });
    await page.click('#nextButton');
    await page.waitForSelector('#enterprise_phone_0');

    await page.type('#enterprise_phone_0', '4697540527');
    await page.type('#enterprise_displayName_0', 'GLOBAL MEDICAL');

    await page.click('#add-number-command');
    await page.waitForSelector('#enterprise_phone_1');
    await page.type('#enterprise_phone_1', '5617701747');
    await page.type('#enterprise_displayName_1', 'GLOBAL MEDICAL');

    await page.select('#enterprise_category', 'telemarketing');
    await page.type('#enterprise_contact_name', 'GLOBAL MEDICAL EQUIPMENT');
    await page.type('#enterprise_contact_phone', '4697540527');
    await page.type('#enterprise_contact_email', email);
    await page.type('#enterprise_company_name', 'GLOBAL MEDICAL EQUIPMENT');
    await page.type('#enterprise_company_address_line_1', '7708 Southern Blvd.');
    await page.type('#enterprise_company_address_line_2', 'Suite 103');
    await page.type('#enterprise_company_address_city', 'West Palm Beach');
    await page.select('#enterprise_company_address_state', 'FL');
    await page.type('#enterprise_company_address_zip', '33411');
    await page.type('#enterprise_company_url', 'https://globalmedicalequipmentsupplies.com/');
    await page.type('#enterprise_service_provider', 'none');
    await page.type('#call_count', '10000');
    await page.type('#additional_feedback', '');

    const button = await page.$('#send-verification-code');
    await button.evaluate(b => b.scrollIntoView());
    await button.click();

    console.log('📨 Waiting for verification code...');
    const code = await getVerificationCode();

    if (code) {
      await page.waitForSelector('#captcha', { visible: true });
      await page.type('#captcha', code);
      console.log('✅ Verification code entered!');
      await page.waitForSelector('#submitButton', { visible: true });
      await page.click('#submitButton');
      console.log('🚀 Form submitted!');
    } else {
      console.log('❌ Verification code not found.');
    }

  } catch (err) {
    console.log(`⚠️ Error occurred: ${err.message}`);
    if (attempt < 3) {
      console.log('🔁 Retrying in 5 seconds...');
      await delay(5000);
      await startAutomation(attempt + 1);
    } else {
      console.log('🛑 Max retries reached. Exiting...');
    }
  } finally {
    if (browser) {
      await delay(2000);
      await browser.close();
    }
  }
};

startAutomation();
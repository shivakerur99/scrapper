const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const getRandomProxy = () => proxies[Math.floor(Math.random() * proxies.length)];

(async () => {
    const { url: proxyUrl, username: proxyUsername, password: proxyPassword } = getRandomProxy();

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--proxy-server=${proxyUrl}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();

    await page.goto('https://www.zoominfo.com/c/rasa-technologies-ltd/460395489', { waitUntil: 'networkidle2', timeout: 180000 });

    // Your scraping logic here

    await browser.close();
})();

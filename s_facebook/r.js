const puppeteer = require('puppeteer');

async function scrapeFacebookAdsLibrary() {
  // Launch a new browser instance
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set the viewport to mobile view
  await page.setViewport({ width: 612, height: 816, deviceScaleFactor: 1.25 });

  // Set user agent and other necessary headers
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
  );

  // Set cookies with the domain
  const cookies = [
    { name: 'datr', value: 'E9isZtudGpk9gHZgkhKUP2-X', domain: 'facebook.com' },
    { name: 'ps_l', value: '1', domain: 'facebook.com' },
    { name: 'ps_n', value: '1', domain: 'facebook.com' },
    { name: 'sb', value: 'JyKtZhBZr0U2q0Sxt4lHsSo3', domain: 'facebook.com' },
    { name: 'c_user', value: '100014935682771', domain: 'facebook.com' },
    { name: 'dpr', value: '2.0000000298023224', domain: 'facebook.com' },
    { name: 'fr', value: '1F4R8jKGBD7C0Y3u4.AWWa0pJKGaqy_vgXMlcFLjFg8K8.BmsKAp..AAA.0.0.BmsKAp.AWWQTEVXaMk', domain: 'facebook.com' },
    { name: 'xs', value: '18%3AVWRMk20PtWHjQQ%3A2%3A1722622521%3A-1%3A5437%3A%3AAcWtkrr1QbiX1g2H6UQg5pc9zMmAFAQykaHVrAnFJw', domain: 'facebook.com' },
    { name: 'wd', value: '827x816', domain: 'facebook.com' }
  ];
  await page.setCookie(...cookies);

  // Navigate to the Facebook Ads Library page
  await page.goto('https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&id=866673115358298&view_all_page_id=139731946049246&search_type=page&media_type=all', { waitUntil: 'networkidle2' });

  // Wait for the content to load
  
  await page.waitForSelector('script', { timeout: 60000 });

  // Extract data from the script tag
  const adData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    let data = null;

    scripts.forEach(script => {
      const text = script.textContent || '';
      if (text.includes('ads_library_ad_archive_response')) {
        const regex = /ads_library_ad_archive_response\s*=\s*(\{.*?\});/;
        const match = text.match(regex);
        if (match && match[1]) {
          try {
            data = JSON.parse(match[1]);
          } catch (e) {
            console.error('Failed to parse JSON:', e);
          }
        }
      }
    });

    return data;
  });

  console.log(adData);

  // Close the browser
  await browser.close();
}

scrapeFacebookAdsLibrary();

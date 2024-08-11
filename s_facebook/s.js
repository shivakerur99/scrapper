  // await sleep(1000);

    // await page.type("div.x178xt8z.xm81vs4.xso031l.xy80clv.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x1x20ilw.xqypomt.x13wwr7t.xgf0l9q.xhk9q7s.x1otrzb0.x1i1ezom.x1o6z2jb.x9f619.xc9qbxq.xh8yej3 > div > input", "FC Barcelona");
    // await sleep(1000);

    // // await page.focus("div.x1d52u69 > div > div > div");

    // // Press the "Enter" key
    // await page.keyboard.press('Enter');
    
    // Optionally, add a sleep to wait for any actions to complete

    const puppeteer = require('puppeteer');
    const fs = require('fs');
    
    const sleep = (milliseconds) => {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    };
    
    (async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
    
        const baseURL = 'https://www.facebook.com/ads/library/?active_status=all&ad_type=all';
        const queryParams = '&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=keyword_unordered&media_type=all';
    
        // Function to construct the URL
        function constructURL(country, search) {
            return `${baseURL}&country=${country}&q=${encodeURIComponent(search)}${queryParams}`;
        }
    
        // Example usage
        const country = 'IN';
        const search = 'bajaj';
    
        const url = constructURL(country, search);
        console.log(url);
    
        await page.goto(url);
        await sleep(5000);
        async function autoScrollAndExtract(page) {
            let adsData = [];
            let adsExtracted = 0;
    
            while (adsExtracted < 100) {
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight);
                });
    
                await sleep(10000); // Wait for content to load
    
                const ads = await page.evaluate(() => {
                    // Extract all ads
                    const adElements = document.querySelectorAll('div.xh8yej3');
    
                    const adData = [];
    
                    adElements.forEach(ad => {
                        // Extracting Library ID
                        const libraryId = ad.querySelector('.xt0e3qv')?.textContent.trim() || '';
    
                        // Extracting Ad Status
                        const adStatus = ad.querySelector('div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div:nth-child(2) > span')?.textContent.trim() || '';
    
                        // Extracting Start Date
                        const startDate = ad.querySelector('div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div:nth-child(3) > span')?.textContent.trim() || '';
    
                        // Extracting Creative Count
                        const creativeCount = ad.querySelector('span.x8t9es0.x1fvot60.xo1l8bm.xxio538.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli')?.textContent.trim() || '';
    
                        // Extracting Ad Title and Link
                        const adTitle = ad.querySelector('a.xt0psk2 span.x8t9es0.x1fvot60.xxio538.x108nfp6.xq9mrsl.x1h4wwuj.x117nqv4')?.textContent.trim() || '';
                        const adLink = ad.querySelector('a.xt0psk2')?.href || '';
    
                        // Extracting Ad Description
                        const adDescription = ad.querySelector('div._7jyr span.x8t9es0.xw23nyj.xo1l8bm.x63nzvj.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli div')?.textContent.trim() || '';
    
                        adData.push({
                            libraryId,
                            adStatus,
                            startDate,
                            creativeCount,
                            adTitle,
                            adLink,
                            adDescription
                        });
                    });
    
                    return adData;
                });
    
                adsData = adsData.concat(ads);
                adsExtracted = adsData.length;
    
                if (adsExtracted >= 100) {
                    adsData = adsData.slice(0, 100); // Limit to 100 ads
                    break;
                }
            }
    
            return adsData;
        }
    
        const adsData = await autoScrollAndExtract(page);
    
        console.log(adsData);
    
        // Write the extracted data to a JSON file
        fs.writeFileSync('adsData.json', JSON.stringify(adsData, null, 2), 'utf-8');
        
        console.log('Data has been written to adsData.json');
    
        await browser.close();
    })();
    
    // const puppeteer = require('puppeteer');
    // const fs = require('fs').promises;

    // (async () => {
    //     const browser = await puppeteer.launch({ headless: false });
    //     const page = await browser.newPage();
    
    //     const baseURL = 'https://www.facebook.com/ads/library/?active_status=all&ad_type=all';
    //     const queryParams = '&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=keyword_unordered&media_type=all';
    
    //     // Function to construct the URL
    //     function constructURL(country, search) {
    //         return `${baseURL}&country=${country}&q=${encodeURIComponent(search)}${queryParams}`;
    //     }
    
    //     // Example usage
    //     const country = 'IN';
    //     const search = 'Bajaj Finserv';
    
    //     const url = constructURL(country, search);
    //     console.log(url);
    
    //     await page.goto(url, { waitUntil: 'networkidle2' });
    
    //     async function autoScrollAndExtract(page) {
    //         let adsData = [];
    //         let adsExtracted = 0;
    
    //         while (adsExtracted < 100) {
    //             // Wait for content to load
    
    //             const ads = await page.evaluate(() => {
    //                 const adElements = document.querySelectorAll('div.xh8yej3');
    //                 const adData = [];
    
    //                 adElements.forEach(ad => {
    //                     const libraryIdElement = ad.querySelector('span.x8t9es0.xw23nyj.xo1l8bm.x63nzvj.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli');
    //                     const statusElement = ad.querySelector('div.x3nfvp2.x1e56ztr span.x8t9es0.xw23nyj.x63nzvj.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli.x1i64zmx');
    //                     const runningDateElement = ad.querySelector('div.x3nfvp2.x1e56ztr:nth-child(3) span');
    //                     const platformsElements = ad.querySelectorAll('div.x1rg5ohu.x67bb7w div.xq5s12p span div.xtwfq29');
    //                     const adDetailsElement = ad.querySelector('div.x8t9es0.x1fvot60.xxio538.x1heor9g.xuxw1ft.x6ikm8r.x10wlt62.xlyipyv.x1h4wwuj.x1pd3egz.xeuugli');
    
    //                     const libraryId = libraryIdElement ? libraryIdElement.innerText : '';
    //                     const status = statusElement ? statusElement.innerText : '';
    //                     const runningDate = runningDateElement ? runningDateElement.innerText : '';
    //                     const adDetails = adDetailsElement ? adDetailsElement.innerText : '';
    
    //                     adData.push({
    //                         libraryId,
    //                         status,
    //                         runningDate,
    //                         adDetails
    //                     });
    //                 });
    
    //                 return adData;
    //             });
    
    //             adsData = adsData.concat(ads);
    //             adsExtracted = adsData.length;
    
    //             if (adsExtracted >= 100) {
    //                 adsData = adsData.slice(0, 100); // Limit to 100 ads
    //                 break;
    //             }
    //         }
    
    //         return adsData;
    //     }
    
    //     const adsData = await autoScrollAndExtract(page);
    
    //     console.log(adsData);
    
    //     // Write the extracted data to a JSON file
    //     fs.writeFileSync('adsData.json', JSON.stringify(adsData, null, 2), 'utf-8');
        
    //     console.log('Data has been written to adsData.json');
    
    //     await browser.close();
    // })();
    
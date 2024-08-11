const puppeteer = require("puppeteer");
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const checkIfJobExists = async (jobTitle, jobDescription) => {
    const params = {
        TableName: 'jobs',
        FilterExpression: 'jobTitle = :jobTitle AND jobDescription = :jobDescription',
        ExpressionAttributeValues: {
            ':jobTitle': jobTitle,
            ':jobDescription': jobDescription
        }
    };

    try {
        const data = await dynamoDB.scan(params).promise();
        return data.Items.length > 0;
    } catch (error) {
        console.error('Error checking if job exists in DynamoDB:', error);
        return false;
    }
};

const insertDataIntoDynamoDB = async (data) => {
    console.log('Inserting data into DynamoDB...');

    for (const job of data) {
        const exists = await checkIfJobExists(job.jobTitle, job.jobDescription);
        if (exists) {
            console.log(`Job already exists: ${job.jobTitle}`);
            continue;
        }

        job.jobID = uuidv4();

        const params = {
            TableName: 'jobs',
            Item: job
        };

        try {
            await dynamoDB.put(params).promise();
            console.log(`Inserted job: ${job.jobTitle} with ID: ${job.jobID}`);
        } catch (error) {
            console.error('Error inserting data into DynamoDB:', error);
        }
    }

    try {
        await fs.writeFile('scrapedJobData.json', JSON.stringify(data, null, 2));
        console.log('Data written to JSON file successfully!');
    } catch (err) {
        console.error('Error writing data to JSON file:', err);
    }
};

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
    });
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
    await sleep(10000);

    let jobs = [];

    while (true) {
        await page.waitForSelector('.xh8yej3');

        console.log('Scraping job listings from the current page...');
        const newJobs = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('.xh8yej3');
            const jobData = [];

            jobElements.forEach(job => {
                const ADlibraryID= job.querySelector('.x1rg5ohu.x67bb7w').textContent.trim();
                const ADstatus=job.querySelector('div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div:nth-child(2) > span').textContent.trim();
                const ADlaunchedDate= job.querySelector('div.x78zum5.xdt5ytf.x2lwn1j.xeuugli > div:nth-child(3) > span').href;
                const similarADs = job.querySelector(' div.x6s0dn4.x78zum5.xsag5q8 > span > strong').textContent.trim();
                const ADowner=job.querySelector('.x1rg5ohu.x67bb7w').textContent.trim();
                const ADownerLink=job.querySelector('.x1rg5ohu.x67bb7w').href;
                const ADdescription=job.querySelector('div.x6ikm8r.x10wlt62 > div > span').textContent.trim();
                // const ADmedia=job.querySelector('')
                jobData.push({
                    ADlibraryID,
                    ADstatus,
                    ADlaunchedDate,
                    similarADs,
                    ADowner,
                    ADownerLink,
                    ADdescription,
                    jobID: '',
                    jobDescription: ''
                });
            });

            return jobData;
        });

        jobs = [...jobs, ...newJobs];
        console.log(jobs);

        break;

        // const nextButton = await page.$('#content > div.pagenav.tf_clear.tf_box.tf_textr.tf_clearfix > a.number.nextp');
        // if (!nextButton) {
        //     console.log('No more jobs to load.');
        //     break;
        // }

        // await nextButton.click();
        // await sleep(10000); 

    }

    console.log('Job listings scraped successfully:', jobs);

    for (let job of jobs) {
        const jobPage = await browser.newPage();
        await jobPage.goto(job.jobDescriptionUrl, { waitUntil: 'networkidle2' });

        const additionalDetails = await jobPage.evaluate(() => {
            const getTextContent = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : 'NA';
            };

            const jobDescription = getTextContent('.post-content');

            return {
                jobDescription: jobDescription
            };
        });

        job.jobDescription = additionalDetails.jobDescription;

        await jobPage.close();
    }

    console.log('Job listings with additional details:', jobs);

    await browser.close();

    await insertDataIntoDynamoDB(jobs);
})();


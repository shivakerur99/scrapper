const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); 
require('dotenv').config(); 

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();


async function scrapeRemoteJobsData(url) {
    console.log('Scraping job listings from Remote Jobs...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('article.sc-506be909-0');

    const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('article.sc-506be909-0');
        const jobData = [];

        jobElements.forEach(job => {
            const jobTitle = job.querySelector('a.sc-aa54dee-0')?.textContent.trim() || 'NA';
            const companyName = job.querySelector('span.sc-7b9b9acb-0.jWpGqM')?.textContent.trim() || 'NA';
            const jobLocation = job.querySelector('.sc-506be909-0 .sc-d36f5d56-2')?.textContent.trim() || 'NA';
            const jobDescriptionUrl = job.querySelector('a.sc-aa54dee-0')?.href || 'NA';
            const jobSalary = job.querySelector('.sc-7b9b9acb-0.xyNUv')?.textContent.trim() || 'NA';
            const jobType = job.querySelector('ul.sc-506be909-0 li:nth-child(3) .sc-7b9b9acb-0')?.textContent.trim() || 'NA';

            jobData.push({
                jobTitle,
                companyName,
                jobLocation,
                jobDescriptionUrl,
                jobSalary,
                jobType
            });
        });

        return jobData;
    });

    await browser.close();
    console.log('Job listings scraped successfully from Remote Jobs!');
    return jobs;
}

async function scrapeDescription(url) {
    console.log('Scraping job description from:', url);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('p');

    const description = await page.evaluate(() => {
        const paragraphs = Array.from(document.querySelectorAll('p'));
        return paragraphs.map(p => p.textContent.trim());
    });

    await browser.close();
    console.log('Job description scraped successfully!');
    return description;
}

async function insertDataIntoDynamoDB(data) {
    console.log('Inserting data into DynamoDB...');

    for (const job of data) {
        const description = await scrapeDescription(job.jobDescriptionUrl);
        job.Description = description;
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

    fs.writeFileSync('scrapedJobData.json', JSON.stringify(data, null, 2));
    console.log('Data written to JSON file successfully!');
}

async function main() {
    try {
        const remoteJobsUrl = "https://remote.com/jobs";
        
        const remoteJobsData = await scrapeRemoteJobsData(remoteJobsUrl);
        
        await insertDataIntoDynamoDB([...remoteJobsData]);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
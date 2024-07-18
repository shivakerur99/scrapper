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

async function scrapeData(url) {
    console.log('Scraping job listings from Working Nomads...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2' });
    const page_s= await page.content();
    fs.writeFileSync("s.html",page_s)
    
    await page.waitForSelector('.jobs-list');

    const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('.jobs-list > .ng-scope');
        const jobData = [];

        jobElements.forEach(job => {
            const jobType = job.querySelector('.category')?.textContent.trim() || 'NA';
            const jobTitle = job.querySelector('h4 a')?.textContent.trim() || 'NA';
            const jobLocation = job.querySelector('.box .fa-map-marker + span')?.textContent.trim() || 'NA';
            const jobDescriptionUrl = job.querySelector('h4 a')?.href || 'NA';
            const companyName = job.querySelector('.company a')?.textContent.trim() || 'NA';
            const companyWebsite = job.querySelector('.company a')?.href || 'NA';

            jobData.push({
                jobType,
                jobTitle,
                jobLocation,
                jobDescriptionUrl,
                companyName,
                companyWebsite
            });
        });

        return jobData;
    });

    await browser.close();
    console.log('Job listings scraped successfully!');
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
        const url = "https://www.workingnomads.com/jobs";
        const scrapedData = await scrapeData(url);
        await insertDataIntoDynamoDB(scrapedData);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();

const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const fs = require('fs');
const axios = require("axios");
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid'); 
require('dotenv').config(); 

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function scrapeData(url) {
    console.log('Scraping job listings from hubstafftalent.net...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('div.search-result');

    const jobs = await page.$$eval('div.search-result', elements => {
        return elements.map(job => {
            const jobTitleElement = job.querySelector('a.name');
            const jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : 'NA';
            const jobDescriptionUrl = jobTitleElement ? jobTitleElement.href : 'NA';
            const payRateElement = job.querySelector('div.pay-rate');
            const payRate = payRateElement ? payRateElement.textContent.trim() : 'NA';
            const companyNameElement = job.querySelector('a.job-agency');
            const companyName = companyNameElement ? companyNameElement.textContent.trim() : 'NA';
            const companyUrl = companyNameElement ? companyNameElement.href : 'NA';
            const locationElement = job.querySelector('span.location');
            const jobLocation = locationElement ? locationElement.textContent.trim().replace('HQ:', '').trim() : 'NA';
            const remoteJobElement = job.querySelector('span.hi-remote');
            const isRemote = remoteJobElement ? true : false;
            const createdElement = job.querySelector('span.a-tooltip');
            const createdDate = createdElement ? createdElement.getAttribute('data-original-title') : 'NA';

            return {
                jobTitle,
                jobDescriptionUrl,
                payRate,
                companyName,
                companyUrl,
                jobLocation,
                isRemote,
                createdDate
            };
        });
    });

    const jobsWithDescriptions = await Promise.all(jobs.map(async job => {
        try {
            const response = await axios.get(job.jobDescriptionUrl);
            const html = response.data;
            const $ = cheerio.load(html);
            const jobDescriptionElement = $('div.job-description');
            job.jobDescription = jobDescriptionElement.length > 0 ? jobDescriptionElement.text().trim() : 'NA';

            job.skills = $('div.list-inline li a.tag').map((_, el) => $(el).text().trim()).get();

            return job;
        } catch (error) {
            console.error('Error fetching job details:', error);
            return job;
        }
    }));

    await browser.close();
    console.log('Job listings scraped successfully!');
    return jobsWithDescriptions;
}

async function insertDataIntoDynamoDB(data) {
    console.log('Inserting data into DynamoDB...');

    for (const job of data) {
        job.jobID = uuidv4(); 

        const params = {
            TableName: 'jobs',
            Item: {
                jobID: job.jobID, 
                jobTitle: job.jobTitle,
                jobDescriptionUrl: job.jobDescriptionUrl,
                payRate: job.payRate,
                companyName: job.companyName,
                companyUrl: job.companyUrl,
                jobLocation: job.jobLocation,
                isRemote: job.isRemote,
                createdDate: job.createdDate,
                jobDescription: job.jobDescription,
                skills: job.skills
            }
        };

        try {
            await dynamoDB.put(params).promise();
            console.log(`Inserted job: ${job.jobTitle} with ID: ${job.jobId}`);
        } catch (error) {
            console.error('Error inserting data into DynamoDB:', error);
        }
    }

    fs.writeFileSync('scrapedJobData.json', JSON.stringify(data, null, 2));
    console.log('Data written to JSON file successfully!');
}

async function main() {
    try {
        const url = 'https://hubstafftalent.net/search/jobs';
        const scrapedData = await scrapeData(url);
        await insertDataIntoDynamoDB(scrapedData);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require('puppeteer')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(
  AdblockerPlugin({
    // Optionally enable Cooperative Mode for several request interceptors
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
  })
)
puppeteer.use(StealthPlugin());

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
var userAgent = require('user-agents');

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const insertDataIntoDynamoDB = async (companies, tableName) => {
    console.log('Inserting data into DynamoDB...');
    
    for (const company of companies) {
        const exists = await checkIfCompanyExists(company.companyName, company.companyUrl, tableName);
        if (exists) {
            console.log(`Company already exists: ${company.companyName}`);
            continue;
        }
        company.companyID = uuidv4();
        
        const params = {
            TableName: tableName,
            Item: company
        };
        
        try {
            await dynamoDB.put(params).promise();
            console.log(`Inserted company: ${company.companyName} with ID: ${company.companyID}`);
        } catch (error) {
            console.error('Error inserting data into DynamoDB:', error);
        }
    }

    try {
        await fs.writeFile('scrapedCompanyData.json', JSON.stringify(companies, null, 2));
        console.log('Data written to JSON file successfully!');
    } catch (err) {
        console.error('Error writing data to JSON file:', err);
    }
};

const checkIfCompanyExists = async (companyName, companyUrl, tableName) => {
    const params = {
        TableName: tableName,
        FilterExpression: 'companyName = :companyName AND companyUrl = :companyUrl',
        ExpressionAttributeValues: {
            ':companyName': companyName,
            ':companyUrl': companyUrl
        }
    };
    
    try {
        const data = await dynamoDB.scan(params).promise();
        return data.Items.length > 0;
    } catch (error) {
        console.error('Error checking if company exists in DynamoDB:', error);
        return false;
    }
};

const fetchCompanyData = async (browser, location, category) => {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(`https://www.zoominfo.com/companies-search/location-${location}-industry-${category}`, { timeout: 120000, waitUntil: 'networkidle2' });
    
    let companies = [];
    while (true) { // Infinite loop to fetch all company profiles
        await page.waitForSelector('app-company-row');
        
        console.log('Scraping company listings from the current page...');
        const newCompanies = await page.evaluate(() => {
            const companyElements = document.querySelectorAll('app-company-row');
            const companyData = [];

            companyElements.forEach(company => {
                const companyNameElement = company.querySelector('.company-name');
                const companyName = companyNameElement ? companyNameElement.textContent.trim() : 'NA';
                const companyUrl = companyNameElement ? companyNameElement.href : 'NA';
                const industryElement = company.querySelector('.industry');
                const industry = industryElement ? industryElement.textContent.replace(/^Industry/, '').trim() : 'NA';
                const locationElement = company.querySelector('.location');
                const location = locationElement ? locationElement.textContent.replace(/^Location/, '').trim() : 'NA';
                const revenueElement = company.querySelector('.revenue');
                const revenue = revenueElement ? revenueElement.textContent.replace(/^Revenue/, '').trim() : 'NA';
                const employeeElement = company.querySelector('.employees');
                const employees = employeeElement ? employeeElement.textContent.replace(/^Employees/, '').trim() : 'NA';

                companyData.push({
                    companyName,
                    companyUrl,
                    industry,
                    location,
                    revenue,
                    employees,
                    companyID: '',
                    Overview:''
                });
            });
            
            return companyData;
        });
        
        companies = [...companies, ...newCompanies];
        
        const nextButton = await page.$('a.sg-pagination-v2-page-actions.sg-pagination-v2-next');
        
        if (!nextButton) {
            console.log('No more companies to load.');
            break;
        }
        
        await nextButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await sleep(10000); // Adjust sleep time as needed
    }
    
    console.log('Company listings scraped successfully:', companies);
    await page.close();
    
    return companies;
};

// Function to fetch additional details and reviews for each company
const fetchAdditionalDetails = async (browser, company) => {
    const companyPage = await browser.newPage();
    
    await companyPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await companyPage.goto(company.companyUrl, { waitUntil: 'networkidle2' });

    await sleep(30000); // Adjust sleep time as needed
    const additionalDetails = await companyPage.evaluate(() => {
        const getTextContent = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : 'NA';
        };
        
        const overview = getTextContent('#locations-list');
        
        return {
            overview,
        };
    });

    company.overview = additionalDetails.overview;

    await companyPage.close();
};

const scrapeAndSaveData = async (location, category, tableName) => {
    const browser = await puppeteer.launch({ headless: false }); 
    
    try {
        const companies = await fetchCompanyData(browser, location, category);
        
        for (const company of companies) {
            await fetchAdditionalDetails(browser, company);
        }
        await insertDataIntoDynamoDB(companies, tableName);
    } catch (error) {
        console.error('Error during scraping and saving:', error);
    } finally {
        await browser.close();
    }
};

(async () => {
    const location = "afghanistan";
    const category = "software"; // Change category as needed
    const tableName = process.env.DYNAMODB_TABLE_NAME; // Use environment variable for table name

    await scrapeAndSaveData(location, category, tableName);
})();

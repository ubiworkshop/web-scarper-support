const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');

let search_terms = process.argv[2];

const state = process.argv[3];
const pageStart = process.argv[4];
const pageID = process.argv[5];
const pageEnd = process.argv[6];
const city = process.argv[7];
const baseURL = 'https://www.yellowpages.com';

const location_terms = state == undefined ? city :
  city == undefined ? state : `${city}+${state}`;

const searchURL = '/search?search_terms=' + search_terms +
  '&geo_location_terms=' + location_terms + '&page=' + pageID;

var email;

const getCompanies = async () => {
  const html = await rp(baseURL + searchURL).catch(e => {
    console.log('error while querying site');
  });

  const businessMap = cheerio('a.business-name', html).map(async (i, e) => {
    const link = baseURL + e.attribs.href;

    const innerHtml = await rp(link).catch(e => {
      console.log('error while querying innerHtml');
    });

    const website = cheerio('a.primary-btn', innerHtml).prop('href');
    let emailYP = cheerio('a.email-business', innerHtml).prop('href');
    const name = e.children[0].data || cheerio('h1', innerHtml).text();
    const phone = cheerio('p.phone', innerHtml).text();

    //truncate unnecessary url
    let website_str = website + '';
    if (website_str.includes('.com/')) {
      website_str = website_str.split('.com/')[0];
      website_str += '.com/';
    } else if (website_str.includes('.com')) {
      website_str = website_str.split('.com')[0];
      website_str += '.com/';
    }

    website_str = website_str === 'undefined' ? '' : website_str;
    

    //extract email if its not already fetched from yellow pages
    if (emailYP == '' || emailYP == undefined) {
      const emailExtractor = require('node-email-extractor').default;
      await (async () => {
        email = await emailExtractor.url(website_str);
        if (email !== undefined && email.emails !== undefined) {
          email = email.emails;
          // filtering out garbage & invalid emails
          email = email.filter((element) => {
            if (element.includes('.png') || element.includes('.gif') || element.includes('wixpress') ||
              element.includes('@email') || element.match('@[1-9]') !== null)
              return false;
            else
              return true;
          })
          email = email.toString();
        }
        else
          email = '';
      })()
    }

    // column format for csv
    return {
      name,
      phone,
      website_str,
      email: email,
      emailYP: emailYP ? emailYP.replace('mailto:', '') : ''
    }
  }).get();
  return Promise.all(businessMap);
};

getCompanies()
  .then(result => {
    const transformed = new otcsv(result);
    let fileNo = 1;

    //giving file friendly name
    let location = city !== undefined ? city + "-" + state : state;

    //replacing + with -
    search_terms = search_terms.replace(/[+]/g,'-');
    location = location.replace(/[+]/g, '-');
    
    console.log(location,search_terms);

    /*check if file of same name already exists
      if yes, store results of this set of queries in new file*/
    const fs = require('fs')
    let path = `./${search_terms}@${location}[${pageStart}-${pageEnd}]_${fileNo}.csv`;

    function isFileExisting(path) {
      try {
        if (fs.existsSync(path)) {
          fileNo++;
          path = `./${search_terms}@${location}[${pageStart}-${pageEnd}]_${fileNo}.csv`;
          isFileExisting(path);
        }
      } catch (err) {
        console.log(err);
      }
    }

    //checking for page iteration (1-n)
    const iteration = parseInt(pageID) - parseInt(pageStart);
    if (iteration == 0) {
      isFileExisting(path);
      path = `./${search_terms}@${location}[${pageStart}-${pageEnd}]_${fileNo}.csv`;
      transformed.toDisk(path, { append: true });
    } else {
      isFileExisting(path);
      fileNo--;
      path = `./${search_terms}@${location}[${pageStart}-${pageEnd}]_${fileNo}.csv`;
      transformed.toDisk(path, { append: true });
    }
  })
  .catch(e => {
    console.log("failed: ", e);
  })
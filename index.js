const puppeteer = require('puppeteer');
const _ = require('lodash');

const PROMPT = {
    ID: process.argv[2],
    PW: process.argv[3],
};

const TARGET_COOKIE_HEADER = 'set-cookie';

const GLOBAL_AUTH_INFO = {
    AUT: null,
    SES: null,
};

const extractAuthFromCookies = (cookieStr) => _.chain(cookieStr)
    .split('\n')
    .map((line) => {
        const list = _.split(line, ';');
        return _.map(list, (item) => _.split(item, '='))
    })
    .flatten()
    .fromPairs()
    .pick(['NID_SES', 'NID_AUT'])
    .value()

const run = async (targetUrl) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });

    page.on('response', (res) => {
        const headers = res.headers();
        const cookieStr = _.get(headers, TARGET_COOKIE_HEADER, null);
        const url = res.url();
        if (_.isNull(cookieStr) || url !== targetUrl) {
            return;
        }
        const { NID_AUT, NID_SES } = extractAuthFromCookies(cookieStr);
        GLOBAL_AUTH_INFO.AUT = NID_AUT;
        GLOBAL_AUTH_INFO.SES = NID_SES;
    });

    await page.goto(targetUrl, {
        waitUntil: 'networkidle0',
    });

    await page.evaluate(
        () => {
            document.querySelector("#id").value = PROMPT.ID;
            document.querySelector("#pw").value = PROMPT.PW;
        },
    );
    await page.click(".btn_login");
    await page.waitForNavigation();
    await page.screenshot({ type: 'webp', path: './test.webp', fullPage: true });

    await browser.close();
};

const someApp = async () => {
    console.log(`initial : ${JSON.stringify(GLOBAL_AUTH_INFO)}`);
    await run('https://nid.naver.com/nidlogin.login');

    console.log(`after auth info : ${JSON.stringify(GLOBAL_AUTH_INFO)}`);
}

someApp();


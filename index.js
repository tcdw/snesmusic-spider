const { JSDOM } = require('jsdom');
const { URL } = require('url');

(async () => {
    const homePage = await JSDOM.fromURL("http://snesmusic.org/v2/");
    const menu = homePage
        .window
        .document
        .querySelector('.navigation')
        .getElementsByTagName('a');
    for (let i = 0; i < menu.length; i++) {
        const subURL = new URL(menu[i].href);
        let subPage;
        let page = 0;
        do {
            subURL.searchParams.set('limit', page * 30);
            subPage = await JSDOM.fromURL(subURL.toString());
            const titleDOMs = subPage
            .window
            .document
            .getElementById('contContainer')
            .getElementsByTagName('b');
            for (let j = 0; j < titleDOMs.length; j++) {
                console.log(titleDOMs[j].childNodes[0].textContent);
            }
            page += 1;
        } while (subPage
            .window
            .document
            .getElementById('contContainer')
            .childNodes[2]
            .textContent !== 'No results.'
        );
    }
})();
const { JSDOM } = require('jsdom');
const { URL } = require('url');

/**
 * 读取某个节点前面的节点
 * @param {Node} node
 * @param {number} amount
 */
const forwardNode = (node, amount) => {
    if (amount < 0) {
        for (let i = 0; i < -amount; i++) {
            node = node.previousSibling;
        }
    } else {
        for (let i = 0; i < amount; i++) {
            node = node.nextSibling;
        }
    }
    return node;
}

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
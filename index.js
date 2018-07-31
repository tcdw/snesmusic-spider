const { JSDOM } = require('jsdom');
const { URL } = require('url');
const fs = require('fs');

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
    const data = {
        games: [],
    };
    console.log('正在抓取首页 ...');
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
            console.log(`正在抓取 ${subURL.searchParams.get('char')} 的第 ${page + 1} 页 ...`);
            subURL.searchParams.set('limit', page * 30);
            subPage = await JSDOM.fromURL(subURL.toString());
            const titleDOMs = subPage
                .window
                .document
                .getElementById('contContainer')
                .getElementsByTagName('b');
            for (let j = 0; j < titleDOMs.length; j++) {
                data.games.push({
                    name: titleDOMs[j].childNodes[0].textContent,
                    id: Number(new URL(titleDOMs[j].childNodes[0].href).searchParams.get('selected')),
                });
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
    fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), { encoding: 'utf8' });
})();
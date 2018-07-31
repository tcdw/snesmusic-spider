const { JSDOM } = require('jsdom');
const { URL } = require('url');
const parallelLimit = require('run-parallel-limit');
const fs = require('fs');

const infoOrder = ['composer', 'developer', 'publisher', 'released', 'dumper', 'tagger'];
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
    const runOne = async (i) => {
        console.log(`(${i + 1} / ${data.games.length}) 正在抓取 ${data.games[i].name} 的元数据`);
        const infoPage = await JSDOM.fromURL(`http://snesmusic.org/v2/profile.php?profile=set&selected=${data.games[i].id}`);
        const infoTable = infoPage
            .window
            .document
            .querySelector('.gameinfo')
            .getElementsByTagName('tr');
        for (let j = 0; j < 6; j++) {
            if (j === 3) {
                data.games[i][infoOrder[j]] = infoTable[j].getElementsByTagName('td')[1].textContent;
            } else {
                data.games[i][infoOrder[j]] = [];
                const composerDOM = infoTable[j].getElementsByTagName('td')[1].getElementsByTagName('a');
                for (let k = 0; k < composerDOM.length; k++) {
                    const tempHref = new URL(composerDOM[k].href);
                    if (tempHref.searchParams.get('selected')) {
                        data.games[i][infoOrder[j]].push(Number(new URL(composerDOM[k].href).searchParams.get('selected')));
                    }
                }
            }
        }
    }
    const tasks = [];
    for (let i = 0; i < data.games.length; i++) {
        tasks[i] = async (callback) => {
            await runOne(i);
            callback();
        }
    }
    parallelLimit(tasks, 12, () => {
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), { encoding: 'utf8' });
    });
})();
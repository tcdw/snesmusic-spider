const { JSDOM } = require('jsdom');
const { URL } = require('url');
const parallelLimit = require('run-parallel-limit');
const fs = require('fs');
const download = require('download');

const infoOrder = ['composer', 'developer', 'publisher', 'released', 'dumper', 'tagger'];

const toKeyValues = (element) => {
    const newElement = {};
    for (let i = 0; i < element.length; i++) {
        newElement[element[i][0]] = element[i][1];
    }
    return newElement;
}

(async () => {
    const data = {
        games: [],
    };
    const company = new Map();
    const composer = new Map();
    const dumper = new Map();
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
                const infoDOM = infoTable[j].getElementsByTagName('td')[1].getElementsByTagName('a');
                for (let k = 0; k < infoDOM.length; k++) {
                    const tempHref = new URL(infoDOM[k].href);
                    if (tempHref.searchParams.get('selected')) {
                        const num = Number(new URL(infoDOM[k].href).searchParams.get('selected'));
                        data.games[i][infoOrder[j]].push(num);
                        switch (j) {
                            case 0:
                                composer.set(num, infoDOM[k].textContent);
                                break;
                            case 1:
                            case 2:
                                company.set(num, infoDOM[k].textContent);
                                break;
                            case 4:
                            case 5:
                                dumper.set(num, infoDOM[k].textContent);
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
        // download info
        const downloadDOM = infoPage
            .window
            .document
            .querySelector('.download');
        data.games[i].setName = new URL(downloadDOM.href).searchParams.get('spcNow');
        // relative info
        const relative = infoPage
            .window
            .document
            .getElementById('contContainer')
            .getElementsByTagName('a');
        let k = relative.length - 1;
        data.games[i].relative = [];
        while (relative[k].className !== 'download' && k >= 0) {
            if (new URL(relative[k].href).searchParams.get('selected')) {
                data.games[i].relative.push(Number(new URL(relative[k].href).searchParams.get('selected')));
            }
            k -= 1;
        }
        // region info
        const region = infoPage
            .window
            .document
            .getElementById('contContainer')
            .getElementsByTagName('img')[0];
        data.games[i].region = region.src.slice(39, -4);
        // tracklist
        const trackListDOM = infoPage
            .window
            .document
            .querySelector('.tracklist');
        const trackNumberDOM = trackListDOM.getElementsByClassName('tracknumber');
        const trackTitleDOM = trackListDOM.getElementsByClassName('tracktitle');
        const trackTimeDOM = trackListDOM.getElementsByClassName('tracktime');
        data.games[i].trackList = [];
        for (let j = 1; j < trackNumberDOM.length; j++) {
            data.games[i].trackList.push({
                number: trackNumberDOM[j].textContent,
                title: trackTitleDOM[j].textContent,
                length: new Date(`1970-01-01T00:${trackTimeDOM[j].textContent}.000Z`).getTime() / 1000,
            });
        }
        // screen
        if (!fs.existsSync(`./screen/${setName}.png`)) {
            console.log(`(${i + 1} / ${data.games.length}) 正在下载 ${data.games[i].name} 的插图`);
            const screen = infoPage.window.document.querySelector('.screen').src;
            await download(screen, 'screen').catch((e) => {
                console.log(`(${i + 1} / ${data.games.length}) 无法下载 ${data.games[i].name} 的插图，可能是因为该游戏根本没有插图。
错误详情：${e}`);
            });
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
        data.company = toKeyValues(Array.from(company.entries()));
        data.composer = toKeyValues(Array.from(composer.entries()));
        data.dumper = toKeyValues(Array.from(dumper.entries()));
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), { encoding: 'utf8' });
    });
})();
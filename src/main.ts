/// <reference path="../typings/bundle.d.ts" />

// Electron
import * as app   from 'app';
import * as ipc   from 'ipc';
import * as shell from 'shell';

import * as Tray          from 'tray';
import * as Menu          from 'menu';
import * as BrowserWindow from 'browser-window';

// Node
import * as path from 'path';
import * as fs   from 'fs';

import assign = require('lodash.assign');

// app
import * as auth    from './auth';
import * as adsense from './adsense';

let tray: GitHubElectron.Tray;
let authWindow: GitHubElectron.BrowserWindow;

let authJSONFile   = path.join(app.getPath('userData'), 'auth.json');
let configJSONFile = path.join(app.getPath('userData'), 'config.json');

let config = {
  Span:      'Today',
  Dimension: 'Date',
  Metric:    'Earnings'
};

// Each options should be merged by this order
// e.g. as "dimension" must be overridden by Dimension configuration
const OPTIONS = {
  Span:      {
    'Today':        { startDate: 'today' },
    'Last 7 days':  { startDate: 'today-6d' },
    'Last 1 month': { startDate: 'today-1m' },
  },
  Dimension: {
    'Date':    { dimension: 'DATE' },
    'Ad Unit': { dimension: 'AD_UNIT_NAME' }
  },
  Metric:    {
    'Earnings':  { metric: 'EARNINGS' },
    'Clicks':    { metric: 'CLICKS' },
    'Pageviews': { metric: 'PAGEVIEWS' },
  }
};

// from authWindow
ipc.on('auth-token-entered', (ev, code) => {
  auth.getAccessToken(code).then(
    (tokens: auth.Tokens) => {
      fs.writeFile(authJSONFile, JSON.stringify(tokens), (err) => {
        if (err) {
          console.error('writeFile:', authJSONFile, err);
        }
      });

      adsense.reset();
      updateNow();

      ev.sender.send('auth-token-success', tokens);

      authWindow.close();
    },
    (err) => {
      ev.sender.send('auth-token-error', err.toString());
    }
  );
});

function authorize(force: boolean = false) {
  if (force || !auth.isAuthenticated()) {
    authWindow = new BrowserWindow({ 'use-content-size': true });
    authWindow.loadUrl('file://' + __dirname + '/../view/auth.html');
    authWindow.on('closed', () => { authWindow = null });

    let authUrl = auth.getAuthUrl();
    shell.openExternal(authUrl);
  }
}

function restoreTokens() {
  try {
    let content = fs.readFileSync(authJSONFile).toString();
    let tokens = JSON.parse(content);
    auth.setTokens(tokens);
  } catch (err) {
    console.error(err);
  }
}

function updateMenuItems(detailItems: string[], account?: adsense.Account) {
  let items: GitHubElectron.MenuItemOptions[] = [];

  detailItems.forEach((detail: string) => {
    items.push({
      label:   detail,
      enabled: false
    });
  });

  if (detailItems.length > 0) {
    items.push({ type: 'separator' });
  }

  // Add menu items like below:
  // - Span: Today
  // - Dimension: Date
  // - Metric: Earnings
  [ 'Span', 'Dimension', 'Metric' ].forEach((key: string) => {
    items.push({
      label:   key + ': ' + config[key],
      type:    'submenu',
      submenu: Object.keys(OPTIONS[key]).sort().map((name) => {
        return {
          label:   name,
          type:    'radio',
          checked: (name === config[key]),

          click: (item, focusedWindow) => {
            config[key] = name;
            saveConfig();
            updateNow();
          }
        };
      })
    });
  });

  items.push({ type: 'separator' });

  items.push({
    label: account ? account.name + ' (' + account.id + ')' : 'Authorize...',
    click: function () {
      authorize(true);
    }
  });

  items.push({ type: 'separator' });

  items.push({
    label: 'Quit',
    click: function () {
      app.quit();
    }
  });

  let contextMenu = Menu.buildFromTemplate(items);
  tray.setContextMenu(contextMenu);
}

let updateTimer: NodeJS.Timer;
function updateNow() {
  clearTimeout(updateTimer);
  _update();
}

function _update() {
  let next = () => {
    updateTimer = setTimeout(_update, 30 * 60 * 1000);
  };

  adsense.getReport(
    assign.apply(
      null,
      [ {} ].concat(
        [ 'Span', 'Dimension', 'Metric' ].map((key: string) => OPTIONS[key][config[key]])
      )
    )
  ).then(
    (res: adsense.ReportResult) => {
      tray.setTitle(''+(res.report.totals[1] || 0));

      updateMenuItems(
        res.report.rows.map((row) => {
          let currency = res.report.headers[1].currency;
          return row[0] + ': ' + row[1] + (currency ? ' ' + currency : '');
        }),
        res.account
      );
    },
    (err) => {
      updateMenuItems(
        [ ''+err ]
      );
    }
  ).then(next, next);
}

function loadConfig() {
  try {
    let content = fs.readFileSync(configJSONFile).toString();
    config = JSON.parse(content);
  } catch (err) {
    console.error(err);
  }
}

function saveConfig() {
  fs.writeFile(configJSONFile, JSON.stringify(config), (err) => {
    if (err) {
      console.error('saveConfig:', configJSONFile, err);
    }
  });
}

app.on('ready', () => {
  loadConfig();

  restoreTokens();

  authorize();

  updateNow();

  tray = new Tray(path.resolve(__dirname, '..', 'res/icon.png'));
  updateMenuItems([ 'Loading...' ]);
});

app.on('window-all-closed', () => {}); // nop

app.dock.hide();

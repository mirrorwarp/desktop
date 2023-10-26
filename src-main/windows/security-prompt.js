const BaseWindow = require('./base');
const {APP_NAME} = require('../brand');
const {translate, getLocale, getStrings} = require('../l10n');

/** @type {Electron.BrowserWindow|null} */
let nextProjectWindow = null;

class SecurityPromptWindow extends BaseWindow {
  constructor (projectWindow, type) {
    // horrible hack...
    nextProjectWindow = projectWindow;

    super();

    this.promptPromise = new Promise((resolve) => {
      this.promptResolve = resolve;
    });

    const ipc = this.window.webContents.ipc;

    ipc.on('init', (event) => {
      event.returnValue = {
        type,
        APP_NAME,
        locale: getLocale(),
        strings: getStrings()
      };
    });

    ipc.handle('ready', (event, options) => {
      this.window.setContentSize(this.getDimensions().width, options.height, false);
      this.show();
    });

    ipc.handle('done', (event, allowed) => {
      this.promptResolve(!!allowed);
      this.window.destroy();
    });

    this.window.on('close', () => {
      this.promptResolve(false);
    });

    this.window.setTitle(`${translate('security-prompt.title')} - ${APP_NAME}`);
    this.window.setBounds(BaseWindow.calculateWindowBounds(projectWindow.getBounds(), this.window.getBounds()));
    this.loadURL('tw-security-prompt://./security-prompt.html');
  }

  getDimensions () {
    return {
      width: 440,
      height: 320
    };
  }

  getPreload () {
    return 'security-prompt';
  }

  isPopup () {
    return true;
  }

  getWindowOptions () {
    const options = super.getWindowOptions();
    const parent = nextProjectWindow;
    nextProjectWindow = null;

    return {
      ...options,
      parent
    };
  }

  done () {
    return this.promptPromise;
  }
}

const show = (window, type, persistency, url) => new SecurityPromptWindow(window, type, persistency, url).done();

SecurityPromptWindow.requestClipboard = (window) => show(window, 'read-clipboard', 'read-clipboard', null);
SecurityPromptWindow.requestNotifications = (window) => show(window, 'notifications', 'notifications', null);

module.exports = SecurityPromptWindow;

/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * RequestPolicy - A Firefox extension for control over cross-site requests.
 * Copyright (c) 2008-2012 Justin Samuel
 * Copyright (c) 2014 Martin Kimmerle
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see {tag: "http"://www.gnu.org/licenses}.
 *
 * ***** END LICENSE BLOCK *****
 */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["Utils"];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

Cu.import("chrome://requestpolicy/content/lib/script-loader.jsm");
ScriptLoader.importModules(["prefs", "constants"], this);





let Utils = (function() {
  let self = {};

  /**
   * Posts an action to the event queue of the current thread to run it
   * asynchronously. Any additional parameters to this function are passed
   * as parameters to the callback.
   *
   * @param {Function} callback
   * @param {Object} thisPtr
   */
  self.runAsync = function(callback, thisPtr) {
    let params = Array.prototype.slice.call(arguments, 2);
    let runnable = {
      run: function() {
        callback.apply(thisPtr, params);
      }
    };
    self.threadManager.currentThread.dispatch(runnable,
        Ci.nsIEventTarget.DISPATCH_NORMAL);
  };
  XPCOMUtils.defineLazyServiceGetter(self, "categoryManager",
      "@mozilla.org/categorymanager;1", "nsICategoryManager");
  XPCOMUtils.defineLazyServiceGetter(self, "threadManager",
      "@mozilla.org/thread-manager;1", "nsIThreadManager");




  self.info = {};

  // get/set last/current RP version
  {
    self.info.lastRPVersion = rpPrefBranch.getCharPref("lastVersion");

    self.info.curRPVersion = "0.0";
    // curRPVersion needs to be set asynchronously
    AddonManager.getAddonByID(EXTENSION_ID, function(addon) {
      rpPrefBranch.setCharPref("lastVersion", addon.version);
      self.info.curRPVersion = addon.version;
      if (self.info.lastRPVersion != self.info.curRPVersion) {
        Services.prefs.savePrefFile(null);
      }
    });
  }

  // get/set last/current app (e.g. firefox) version
  {
    self.info.lastAppVersion = rpPrefBranch.getCharPref("lastAppVersion");

    let curAppVersion = Services.appinfo.version;
    self.info.curAppVersion = curAppVersion;
    rpPrefBranch.setCharPref("lastAppVersion", curAppVersion);

    if (self.info.lastAppVersion != self.info.curAppVersion) {
      Services.prefs.savePrefFile(null);
    }
  }

  self.info.isFirefox = Services.appinfo.ID == FIREFOX_ID;
  self.info.isAustralis = self.info.isFirefox &&
      Services.vc.compare(Services.appinfo.platformVersion, '29') >= 0;

  self.getChromeWindow = function(aContentWindow) {
    return aContentWindow.top.QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIWebNavigation)
                             .QueryInterface(Ci.nsIDocShellTreeItem)
                             .rootTreeItem
                             .QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIDOMWindow);
  };

  self.getBrowserForWindow = function(aContentWindow) {
    let win = self.getChromeWindow(aContentWindow);
    let tab = win.gBrowser._getTabForContentWindow(aContentWindow.top);
    return tab.linkedBrowser;
  }

  self.getChromeWindowForDocShell = function(aDocShell) {
    return aDocShell.QueryInterface(Ci.nsIDocShellTreeItem)
                    .rootTreeItem
                    .QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsIDOMWindow);
  };

  return self;
}());
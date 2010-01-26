/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Instantbird messenging client, released
 * 2007.
 *
 * The Initial Developer of the Original Code is
 * Florian QUEZE <florian@instantbird.org>.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const events = ["buddy-signed-on",
                "buddy-added",
                "account-disconnected",
                "status-away",
                "status-back",
                "purple-quit"];

var gBuddyListContextMenu = null;

function buddyListContextMenu(aXulMenu) {
  this.target  = document.popupNode;
  this.menu    = aXulMenu;
  this.onBuddy = this.target.localName == "buddy";
  this.shouldDisplay = this.onBuddy;
}

// Prototype for buddyListContextMenu "class."
buddyListContextMenu.prototype = {
  openConversation: function blcm_openConversation() {
    if (this.onBuddy)
      this.target.openConversation();
  },
  alias: function blcm_alias() {
    if (this.onBuddy)
      this.target.startAliasing();
  },
  moveToPopupShowing: function blcm_moveToPopupShowing() {
    if (!this.onBuddy)
      return;

    let popup = document.getElementById("context-moveto-popup");
    let item;
    while ((item = popup.firstChild) && item.localName != "menuseparator")
      popup.removeChild(item);

    let groupId = this.target.group.groupId;
    let pcs = Components.classes["@instantbird.org/purple/core;1"]
                        .getService(Ci.purpleICoreService);

    let sortFunction = function (a, b) {
      let [a, b] = [a.name.toLowerCase(), b.name.toLowerCase()];
      return a < b ? 1 : a > b ? -1 : 0;
    };
    pcs.getTags()
       .sort(sortFunction)
       .forEach(function (aTag) {
      item = document.createElement("menuitem");
      item.setAttribute("label", aTag.name);
      item.setAttribute("type", "radio");
      let id = aTag.id;
      item.groupId = id;
      if (groupId == id)
        item.setAttribute("checked", "true");
      popup.insertBefore(item, popup.firstChild);
    });
  },
  moveTo: function blcm_moveTo(aEvent) {
    let item = aEvent.originalTarget;
    if (item.groupId)
      this.target.moveTo(item.groupId);
  },
  moveToNewTag: function blcm_moveToNewTag() {
    let prompts =
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
    let bundle =
      Components.classes["@mozilla.org/intl/stringbundle;1"]
                .getService(Components.interfaces.nsIStringBundleService)
                .createBundle("chrome://instantbird/locale/instantbird.properties");
    let title = bundle.GetStringFromName("newGroupPromptTitle");
    let message = bundle.GetStringFromName("newGroupPromptMessage");
    let name = {};
    if (!prompts.prompt(window, title, message, name, null,
                        {value: false}) || !name.value)
      return; // the user canceled

    let pcs = Components.classes["@instantbird.org/purple/core;1"]
                        .getService(Ci.purpleICoreService);
    let tag = pcs.getTagByName(name.value) || pcs.createTag(name.value);
    this.target.moveTo(tag.id);
  },
  showLogs: function blcm_showLogs() {
    if (!this.onBuddy)
      return;

    var logs = [];
    for (accountId in this.target.accounts) {
      let account = this.target.accounts[accountId];
      for (let log in getIter(account.getLogs()))
        logs.push(log);
    }
    logs.sort(function(log1, log2) log2.time - log1.time);
    window.openDialog("chrome://instantbird/content/viewlog.xul",
                      "Logs", "chrome,resizable", {logs: logs},
                      this.target.getAttribute("displayname"));
  }
};

var buddyList = {
  observe: function bl_observe(aBuddy, aTopic, aMsg) {
    if (aTopic == "purple-quit") {
      window.close();
      return;
    }

    if (aTopic == "status-away") {
      // display the notification on the buddy list
      var nbox = document.getElementById("buddyListMsg");
      var notification = nbox.getNotificationWithValue("away-message");
      if (notification) {
        notification.label = aMsg;
        return;
      }
      var buttons = [{
        accessKey: "",
        label: document.getElementById("awayBundle").getString("away.back.button"),
        popup: null,
        callback: function() {
          Components.classes["@instantbird.org/purple/core;1"]
                    .getService(Components.interfaces.purpleICoreService)
                    .back(null);
        }
      }];
      notification = nbox.appendNotification(aMsg, "away-message",
                                             "chrome://instantbird/skin/away-16.png",
                                             nbox.PRIORITY_INFO_MEDIUM, buttons);
      notification.setAttribute("hideclose", "true");
      document.getElementById("getAwayMenuItem").disabled = true;
      return;
    }

    if (aTopic == "status-back") {
      var nbox = document.getElementById("buddyListMsg");
      var notification = nbox.getNotificationWithValue("away-message");
      if (notification)
        nbox.removeNotification(notification);

      document.getElementById("getAwayMenuItem").disabled = false;
      return;
    }

    if (aTopic == "account-disconnected") {
      let account = aBuddy.QueryInterface(Ci.purpleIAccount);
      if (account.reconnectAttempt <= 1)
        this.showAccountManagerIfNeeded(false);
      return;
    }

    var pab = aBuddy.QueryInterface(Ci.purpleIAccountBuddy);
    var group = pab.tag;
    var groupId = "group" + group.id;
    if ((aTopic == "buddy-signed-on" ||
        (aTopic == "buddy-added" && pab.online)) &&
        !document.getElementById(groupId)) {
      let groupElt = document.createElement("group");
      document.getElementById("buddylistbox").appendChild(groupElt);
      groupElt.build(group);
    }
  },

  getAccounts: function bl_getAccounts() {
    var pcs = Components.classes["@instantbird.org/purple/core;1"]
                        .getService(Ci.purpleICoreService);
    return getIter(pcs.getAccounts());
  },

  /* This function pops up the account manager is no account is
   * connected or connecting.
   * When called during startup (aIsStarting == true), it will also
   * look for crashed accounts.
   */
  showAccountManagerIfNeeded: function bl_showAccountManagerIfNeeded(aIsStarting) {
    let hasActiveAccount = false;
    let hasCrashedAccount = false;
    for (let acc in this.getAccounts()) {
      if (acc.connected || acc.connecting)
        hasActiveAccount = true;

      // We only check for crashed accounts on startup.
      if (aIsStarting && acc.autoLogin &&
          acc.firstConnectionState == acc.FIRST_CONNECTION_CRASHED)
        hasCrashedAccount = true;
    }

    /* We only display the account manager on startup if an account has crashed
       or if all accounts are disconnected
       In case of connection failure after an automatic reconnection attempt,
       we don't want to popup the account manager */
    if (!hasActiveAccount || (aIsStarting && hasCrashedAccount))
      menus.accounts();
  },

  load: function bl_load() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var blistWindows = wm.getEnumerator("Messenger:blist");
    while (blistWindows.hasMoreElements()) {
      var win = blistWindows.getNext();
      if (win != window) {
        win.QueryInterface(Components.interfaces.nsIDOMWindowInternal).focus();
        window.close();
        return;
      }
    }

    try {
      // Set the Vendor for breakpad only
      if ("nsICrashReporter" in Components.interfaces) {
        Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Components.interfaces.nsICrashReporter)
                  .annotateCrashReport("Vendor", "Instantbird");
      }
    } catch(e) {
      // This can fail if breakpad isn't enabled,
      // don't worry too much about this exception.
    }

    // add observers before we initialize libpurple, otherwise we may
    // miss some notifications (this happened at least with the nullprpl)
    addObservers(buddyList, events);

    if (!initPurpleCore()) {
      window.close();
      return;
    }

    Components.utils.import("resource://app/modules/imWindows.jsm");
    Conversations.init();

    buddyList.showAccountManagerIfNeeded(true);
    this.addEventListener("unload", buddyList.unload, false);
    this.addEventListener("close", buddyList.close, false);
  },
  unload: function bl_unload() {
    removeObservers(buddyList, events);
    uninitPurpleCore();
   },

  close: function bl_close(event) {
    event.preventDefault();
    goQuitApplication();
  },

  // Handle key pressing
  keyPress: function bl_keyPress(aEvent) {
    var item = document.getElementById("buddylistbox").selectedItem;
    if (!item) // the list is empty
      return;
    item.keyPress(aEvent);
  }
};

this.addEventListener("load", buddyList.load, false);

const Ci = Components.interfaces;

const events = [
  "account-added",
  "account-removed",
  "account-connected",
  "account-connecting",
  "account-disconnected",
  "account-disconnecting"
];


var gAccountManager = {
  load: function am_load() {
    var pcs = Components.classes["@instantbird.org/purple/core;1"]
                        .getService(Ci.purpleICoreService);
    var accounts = pcs.getAccounts();
    this.accountList = document.getElementById("accountlist");
    while (accounts.hasMoreElements()) {
      var acc = accounts.getNext()
                        .QueryInterface(Ci.purpleIAccount);
      //dump(acc.id + ": " + acc.name + "\n");
      var elt = document.createElement("richlistitem");
      this.accountList.appendChild(elt);
      elt.build(acc);
    }
    this.accountList.selectedIndex = 0;
    var ObserverService = Components.classes["@mozilla.org/observer-service;1"]
                                    .getService(Components.interfaces.nsIObserverService);
    for (var i = 0; i < events.length; ++i)
      ObserverService.addObserver(this, events[i], false);
    window.addEventListener("unload", this.unload, false);
  },
  unload: function am_unload() {
    var ObserverService = Components.classes["@mozilla.org/observer-service;1"]
                                    .getService(Ci.nsIObserverService);
    for (var i = 0; i < events.length; ++i)
      ObserverService.removeObserver(gAccountManager, events[i]);
  },
  observe: function am_observe(aObject, aTopic, aData) {
    if (!(aObject instanceof Ci.purpleIAccount))
      throw "Bad notification.";

    if (aTopic == "account-added") {
      dump("new account : " + aObject.id + ": " + aObject.name + "\n");
      var elt = document.createElement("richlistitem");
      this.accountList.appendChild(elt);
      elt.build(aObject);
      if (this.accountList.getRowCount() == 1)
	this.accountList.selectedIndex = 0;
    }
    else if (aTopic == "account-removed") {
      dump("deleting account : " + aObject.id + ": " + aObject.name + "\n");
      var elt = document.getElementById(aObject.id);
      if (!elt.selected) {
	this.accountList.removeChild(elt);
	return;
      }
      // The currently selected element is removed,
      // ensure another element gets selected (if the list is not empty)
      var selectedIndex = this.accountList.selectedIndex;
      this.accountList.removeChild(elt);
      var count = this.accountList.getRowCount();
      if (!count)
	return;
      if (selectedIndex == count)
	--selectedIndex;
      this.accountList.selectedIndex = selectedIndex;
      dump("new selected index : " + selectedIndex + "\n");
    }

    const stateEvents = {
      "account-connected": "connected",
      "account-connecting": "connecting",
      "account-disconnected": "disconnected",
      "account-disconnecting": "disconnecting"
    };
    if (aTopic in stateEvents)
      document.getElementById(aObject.id)
              .setAttribute("state", stateEvents[aTopic]);
  },
  connect: function am_connect() {
    this.accountList.selectedItem.connect();
  },
  disconnect: function am_disconnect() {
    this.accountList.selectedItem.disconnect();
  },
  delete: function am_delete() {
    this.accountList.selectedItem.delete();
  },
  new: function am_new() {
    window.openDialog("chrome://instantbird/content/account.xul");
  },
  edit: function am_edit() {
    alert("not implemented yet!");
  },
  autologin: function am_autologin() {
    var elt = this.accountList.selectedItem;
    elt.autoLogin = !elt.autoLogin;
  },
  close: function am_close() {
    window.close();
  }
};

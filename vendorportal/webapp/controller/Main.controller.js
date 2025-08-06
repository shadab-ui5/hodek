sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
], (Controller, Models) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.Main", {

        onInit: function () {
            let that = this;
            const oPoModelVh = new sap.ui.model.json.JSONModel();
            const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
            const oPgVHModel = new sap.ui.model.json.JSONModel([]);
            this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
            this.getOwnerComponent().setModel(oPoModelVh, "PoModelVh");
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("UserInfo").then(function (UserInfo) {
                    let loginUser = UserInfo.getId();
                    Models.getUserInfo(that, loginUser).then(() => { console.log("UserInfo Loaded..") }).catch((oError) => {
                        console.error("Failed to load Purchase Orders:", oError);
                    });
                });
            } else {
                console.warn("Not running in Fiori Launchpad, using fallback user");
                let loginUser = "CB9980000026"; // fallback or hardcoded for local testing
                Models.getUserInfo(that, loginUser).then(() => { console.log("UserInfo Loaded..") }).catch((oError) => {
                    console.error("Failed to load Purchase Orders:", oError);
                });;
            }
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.attachRouteMatched(this._onRouteMatched, this);
        },

        onAfterRendering: function () {
            const oIconTabBar = this.getView().byId("idIconTabBarMain");
            // Ensure the control exists before using it
            if (oIconTabBar) {
                oIconTabBar.setTabDensityMode("Compact");
            }
        },
        _onRouteMatched: function (oEvent) {
            const sRouteName = oEvent.getParameter("name");
            const oTabBar = this.byId("idIconTabBarMain");

            if (oTabBar) {
                oTabBar.setSelectedKey(sRouteName);
            }
        },

        /**
         * @function onSelectTabItem
         * @description Navigate to the selected tab
         * @param {object} oEvt event recovered 
         * @public
         */
        onSelectTabItem: function (oEvt) {
            const sSelectedTab = oEvt.getParameter("key");
            if (this.oRouter && sSelectedTab) {
                this.oRouter.navTo(sSelectedTab);
            } else {
                console.warn("Navigation failed.");
            }
        },




    });
});
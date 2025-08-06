sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter"
], (Controller, Models, Formatter) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.VendorPortalScreen", {
        onInit: function () {
            const oVendorModel = new sap.ui.model.json.JSONModel([]);
            this.getView().setModel(oVendorModel, "VendorPortalModel");

            const oODataModel = this.getOwnerComponent().getModel("vendorModel");

            const oFilterModel = new sap.ui.model.json.JSONModel();
            const oTableModel = new sap.ui.model.json.JSONModel();
            const oRouteData = new sap.ui.model.json.JSONModel();
            const oPoModelVh = new sap.ui.model.json.JSONModel();
            const oPgModelVh = new sap.ui.model.json.JSONModel();
            const oPlantModelVh = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oPlantModelVh, "PlantModelVh");
            this.getView().setModel(oPgModelVh, "PgModelVh");
            this.getView().setModel(oPoModelVh, "PoModelVh");
            this.getOwnerComponent().setModel(oFilterModel, "filterModel");
            this.getOwnerComponent().setModel(oTableModel, "TableModelPO");
            this.getOwnerComponent().setModel(oRouteData, "RoutePoData");
            this.getView().setModel(oFilterModel, "FilterModel");

            const oBusyDialog = new sap.m.BusyDialog({ text: "Loading data..." });
            // oBusyDialog.open();
            this._loadSupplierVHData(); // fetch and optionally prefill
            let that = this;

            // Models.loadFilterData(oODataModel, oFilterModel)
            //     .then(() => {
            //         return Models.fetchVendorPortalData(oODataModel, oVendorModel);
            //     })
            //     .then(() => {
            //         oBusyDialog.close();
            //     })
            //     .catch((err) => {
            //         oBusyDialog.close();
            //         sap.m.MessageToast.show("Failed to load data");
            //         console.error("Initialization Error:", err);
            //     });

        },
        formatter: Formatter,
        onSearch: function (oEvent) {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel("vendorModel"); // OData model
            const oTableModel = this.getOwnerComponent().getModel("TableModelPO"); // Target model for results
            const oFilterModel = this.getOwnerComponent().getModel("FilterModel");
            Models.searchPoHeader(oView, oModel, oTableModel)

        },
        onLineItemPress: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem"); // or getSource()
            const oContext = oSelectedItem.getBindingContext("TableModelPO");
            const oData = oContext.getObject();
            this.getOwnerComponent().getModel("RoutePoData").setProperty("/PoHeader", oData);
            // Example: Navigate to another route with PurchaseOrder as parameter
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePurchaseOrder", {
                po: oData.PurchaseOrder // pass any key you need
            });

            // OR: If opening a dialog or using in-place display:
            // this.getView().getModel("DetailModel").setData(oData);
        },
        onNavBack: function () {
            let oHistory = sap.ui.core.routing.History.getInstance();
            let sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal", {}, true); // replace with actual route
            }
        },
        /////////////
        onSupplierValueHelp: function () {
            let oView = this.getView();

            if (!this._oSupplierDialog) {
                this._oSupplierDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.SupplierValueHelp", this);
                oView.addDependent(this._oSupplierDialog);
            }

            // Set model from previously loaded one
            this._oSupplierDialog.setModel(oView.getModel("SupplierVHModel"));
            this._oSupplierDialog.open();
        },
        _loadSupplierVHData: function () {
            let oView = this.getView();
            let sUser = sap.ushell && sap.ushell.Container
                ? sap.ushell.Container.getUser().getId()
                : "CB9980000018"; // fallback for local/dev

            Models.readSupplierVhData(oView, sUser, this);
        },
        onSupplierSearch: function (oEvent) {
            let sValue = oEvent.getParameter("value");
            let aFilters = [
                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("BPSupplierName", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("BPAddrCityName", sap.ui.model.FilterOperator.Contains, sValue)
            ];

            let oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(new sap.ui.model.Filter(aFilters, false));
        },
        onSupplierCancel: function () {
            // Optional: Handle cancel if needed
        },
        onSupplierConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoSupplier");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.Supplier,
                        text: oData.Supplier + " - " + oData.BPSupplierName
                    }));
                });
            }
        },
        onPurchaseOrderValueHelp: function () {
            let oView = this.getView();

            if (!this._oPoDialog) {
                this._oPoDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PurchaseOrderValueHelp", this);
                oView.addDependent(this._oPoDialog);
            }

            // Initialize flags
            this._poSearchQuery = "";
            this._poSkip = 0;
            this._poHasMore = true;
            this._poDialogOpened = false;
            this._initialLoadDone = false;

            this._oPoDialog.setBusy(true);

            Models._loadPurchaseOrders(this, "", 0, 2000, (aData) => {
                const uniqueResults = aData.filter((item, index, self) =>
                    index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                );
                let oModel = this.getView().getModel("PoModelVh");
                oModel.setProperty("/PurchaseOrders", uniqueResults);
                // this._poSkip += aData.length;
                // this._poDialogOpened = true;
                // this._initialLoadDone = true;
                this._oPoDialog.setBusy(false);
                this._oPoDialog.open();
            });
        },
        // onPurchaseOrderUpdateStarted: function () {
        //     // Prevent firing on initial data load
        //     console.log("triggered--")
        //     if (!this._poDialogOpened || !this._poHasMore || !this._initialLoadDone) { return };



        //     this._oPoDialog.setBusy(true);

        //     Models._loadPurchaseOrders(this, this._poSearchQuery, this._poSkip, 2000, (aNewData) => {
        //         const uniqueResults = aNewData.filter((item, index, self) =>
        //             index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
        //         );
        //         let oModel = this.getView().getModel("PoModelVh");
        //         let aOldData = oModel.getProperty("/PurchaseOrders") || [];
        //         oModel.setProperty("/PurchaseOrders", aOldData.concat(uniqueResults));
        //         this._poSkip += aNewData.length;
        //         this._poHasMore = aNewData.length === 2000;
        //         this._oPoDialog.setBusy(false);
        //     });
        // },
        onPurchaseOrderSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._poSearchQuery = sQuery;
            this._poSkip = 0;
            this._poHasMore = true;

            const oModel = this.getView().getModel("PoModelVh");
            const aAllPo = oModel.getProperty("/PurchaseOrders") || [];

            // Filter existing local data
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["Plant", "CompanyCode", "PurchasingGroup", "Supplier", "PurchaseOrder"]);

            } else {
                this._oPoDialog.setBusy(true);

                Models._loadPurchaseOrders(this, sQuery, 0, 2000, (aData) => {
                    const uniqueResults = aData.filter((item, index, self) =>
                        index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                    );
                    let oModel = this.getView().getModel("PoModelVh");
                    oModel.setProperty("/PurchaseOrders", uniqueResults);
                    // this._poSkip += aData.length;
                    // this._poHasMore = aData.length === 2000;
                    this._oPoDialog.setBusy(false);
                });
            }
        },
        onPurchaseOrderConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoNumber");
            let oInputSupplier = this.byId("idPoSupplier");
            let oInputPurchaseGrp = this.byId("idPoPurchGroup");
            oInputSupplier.removeAllTokens();
            oInputPurchaseGrp.removeAllTokens();
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.PurchaseOrder,
                        text: oData.PurchaseOrder
                    }));
                    oInputSupplier.addToken(new sap.m.Token({
                        key: oData.Supplier,
                        text: oData.Supplier
                    }));
                    oInputPurchaseGrp.addToken(new sap.m.Token({
                        key: oData.PurchasingGroup,
                        text: oData.PurchasingGroup
                    }));
                });
            }
        },
        onPurchasingGroupValueHelp: function () {
            let oView = this.getView();

            if (!this._oPgDialog) {
                this._oPgDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PurchasingGroupValueHelp", this);
                oView.addDependent(this._oPgDialog);
            }

            this._pgSearchQuery = "";
            this._pgSkip = 0;
            this._pgHasMore = true;
            this._pgDialogOpened = false;
            this._pgInitialLoadDone = false;

            this._oPgDialog.setBusy(true);

            Models._loadPurchasingGroups(this, "", 0, 2000, (aData) => {
                const uniqueResults = aData.filter((item, index, self) =>
                    index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                );
                let oModel = this.getView().getModel("PgModelVh");
                oModel.setProperty("/PurchasingGroups", uniqueResults);
                this._pgSkip += aData.length;
                this._pgDialogOpened = true;
                this._pgInitialLoadDone = true;
                this._oPgDialog.setBusy(false);
                this._oPgDialog.open();
            });
        },

        // onPurchasingGroupUpdateStarted: function () {
        //     if (!this._pgDialogOpened || !this._pgHasMore || !this._pgInitialLoadDone) return;

        //     this._oPgDialog.setBusy(true);

        //     Models._loadPurchasingGroups(this, this._pgSearchQuery, this._pgSkip, 2000, (aNewData) => {
        //         const uniqueResults = aNewData.filter((item, index, self) =>
        //             index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
        //         );
        //         let oModel = this.getView().getModel("PgModelVh");
        //         let aOldData = oModel.getProperty("/PurchasingGroups") || [];
        //         oModel.setProperty("/PurchasingGroups", aOldData.concat(uniqueResults));
        //         this._pgSkip += aNewData.length;
        //         this._pgHasMore = aNewData.length === 2000;
        //         this._oPgDialog.setBusy(false);
        //     });
        // },

        onPurchasingGroupSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._pgSearchQuery = sQuery;
            this._pgSkip = 0;
            this._pgHasMore = true;
            const oModel = this.getView().getModel("PgModelVh");
            const aAllPurchaseGroup = oModel.getProperty("/PurchasingGroups") || [];

            // Filter existing local data
            const aFilteredPurchaseGroup = aAllPurchaseGroup.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            ); 
            if (aFilteredPurchaseGroup.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["PurchaseOrder", "PurchasingGroup", "Supplier"]);

            } else {
                this._oPgDialog.setBusy(true);

                Models._loadPurchasingGroups(this, sQuery, 0, 2000, (aData) => {
                    const uniqueResults = aData.filter((item, index, self) =>
                        index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                    );
                    let oModel = this.getView().getModel("PgModelVh");
                    oModel.setProperty("/PurchasingGroups", uniqueResults);
                    // this._pgSkip += aData.length;
                    // this._pgHasMore = aData.length === 2000;
                    this._oPgDialog.setBusy(false);
                });
            }
        },
        onPurchasingGroupConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoPurchGroup");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.PurchasingGroup,
                        text: oData.PurchasingGroup
                    }));
                });
            }
        },
        onPlantValueHelp: function () {
            let oView = this.getView();

            if (!this._oPlantDialog) {
                this._oPlantDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PlantValueHelp", this);
                oView.addDependent(this._oPlantDialog);
            }

            this._plantSearchQuery = "";
            this._plantSkip = 0;
            this._plantHasMore = true;
            this._plantDialogOpened = false;
            this._plantInitialLoadDone = false;

            this._oPlantDialog.setBusy(true);

            Models._loadPlants(this, "", 0, 2000, (aData) => {
                const uniqueResults = aData.results.filter((item, index, self) =>
                    index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                );
                let oModel = this.getView().getModel("PlantModelVh");
                oModel.setProperty("/Plants", uniqueResults);
                this._plantSkip += aData.length;
                this._plantDialogOpened = true;
                this._plantInitialLoadDone = true;
                this._oPlantDialog.setBusy(false);
                this._oPlantDialog.open();
            });
        },

        // onPlantUpdateStarted: function () {
        //     if (!this._plantDialogOpened || !this._plantHasMore || !this._plantInitialLoadDone) return;

        //     this._oPlantDialog.setBusy(true);

        //     Models._loadPlants(this, this._plantSearchQuery, this._plantSkip, 2000, (aNewData) => {
        //         const uniqueResults = aNewData.results.filter((item, index, self) =>
        //             index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
        //         );
        //         let oModel = this.getView().getModel("PlantModelVh");
        //         let aOldData = oModel.getProperty("/Plants") || [];
        //         oModel.setProperty("/Plants", aOldData.concat(uniqueResults));
        //         this._plantSkip += aNewData.length;
        //         this._plantHasMore = aNewData.length === 2000;
        //         this._oPlantDialog.setBusy(false);
        //     });
        // },

        onPlantSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._plantSearchQuery = sQuery;
            this._plantSkip = 0;
            this._plantHasMore = true;

            const oModel = this.getView().getModel("PlantModelVh");
            const aAllPlants = oModel.getProperty("/Plants") || [];

            // Filter existing local data
            const aFilteredPlants = aAllPlants.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPlants.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["PlantName", "Plant"]);

            } else {
                // Fallback: hit the service
                this._oPlantDialog.setBusy(true);

                Models._loadPlants(this, sQuery, 0, 2000, (aData) => {
                    const uniqueResults = aData.results.filter((item, index, self) =>
                        index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                    );

                    oModel.setProperty("/Plants", uniqueResults);
                    this._plantSkip += aData.length;
                    this._plantHasMore = aData.length === 2000;
                    this._oPlantDialog.setBusy(false);
                });
            }
        },
        onPlantConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idFilterPlant");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.Plant,
                        text: oData.PlantName
                    }));
                });
            }
        },
        applyDynamicFilter: function (oBinding, sQuery, aFieldNames) {
            let aFilters = aFieldNames.map(sField =>
                new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.Contains, sQuery)
            );

            let oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });

            oBinding.filter([oCombinedFilter]);
        }



    });
});
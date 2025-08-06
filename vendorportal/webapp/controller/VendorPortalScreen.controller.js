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
            const oPlantModelVh = new sap.ui.model.json.JSONModel();
            const oCompanyModel = new sap.ui.model.json.JSONModel();
        
            this.getView().setModel(oCompanyModel, "CompanyCodeModel");
            this.getView().setModel(oPlantModelVh, "PlantModelVh");
            this.getOwnerComponent().setModel(oFilterModel, "filterModel");
            this.getOwnerComponent().setModel(oTableModel, "TableModelPO");
            this.getOwnerComponent().setModel(oRouteData, "RoutePoData");
            this.getView().setModel(oFilterModel, "FilterModel");
        
            const oBusyDialog = new sap.m.BusyDialog({ text: "Loading data..." });
            oBusyDialog.open();
        
            let that = this;
        
            // Load PO data and build company code model
            Models._loadPurchaseOrders(this, "", 0, 4999).then((result) => {
                const uniqueCompanies = [...new Map(
                    result
                        .filter(item => item.CompanyCode)
                        .map(item => [item.CompanyCode, { CompanyCode: item.CompanyCode }])
                ).values()];
        
                that.getView().getModel("CompanyCodeModel").setData(uniqueCompanies);
                that.getView().byId("idPoCompanyCode")?.getBinding("items")?.refresh();
        
                console.log("Company codes loaded:", that.getView().getModel("CompanyCodeModel").getData());
        
                // ✅ Load dependent filters AFTER company codes are set
                that._loadAllFilters();
        
                oBusyDialog.close();
            }).catch((oError) => {
                oBusyDialog.close();
                console.error("Failed to load Purchase Orders:", oError);
            });
        },
        _loadAllFilters: function () {
            // Now CompanyCodeModel is ready, load other filters that depend on it
            console.log("Now loading filters using CompanyCodeModel");
        
            const aCompanyCodes = this.getView().getModel("CompanyCodeModel")?.getData();
        
            // Example: preselect first company, or filter something else
            if (aCompanyCodes?.length === 1) {
                this.getView().byId("idPoCompanyCode").setSelectedKey(aCompanyCodes[0].CompanyCode);
            }
        
            // You can also load SupplierVh, PlantVh, etc., from here safely
        },
        
        formatter: Formatter,
        onSearch: function (oEvent) {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel("vendorModel"); // OData model
            const oTableModel = this.getOwnerComponent().getModel("TableModelPO"); // Target model for results
            const oFilterModel = this.getOwnerComponent().getModel("FilterModel");
            Models.searchPoHeader(this, oView, oModel, oTableModel)

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

        onSupplierSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            let aFilters = [
                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("Suppliername", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGroup", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGrpName", sap.ui.model.FilterOperator.Contains, sQuery)
            ];
            const oModel = this.getView().getModel("SupplierVHModel");
            const aAllPo = oModel.getData() || [];
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["Suppliername", "PurchasingGroup", "PurchasingGrpName", "Supplier"]);

            } else {
                let oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter(new sap.ui.model.Filter(aFilters, false));
            }
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
                        text: oData.Supplier + " - " + oData.Suppliername
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
            this._oPoDialog.open();

        },

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
                Models._loadPurchaseOrders(this, sQuery, 0, 2000)
                    .then(() => {
                        this._oPoDialog.setBusy(false); // ✅ Stop busy after success
                    })
                    .catch((oError) => {
                        this._oPoDialog.setBusy(false); // ✅ Also stop busy on error
                        console.error("Failed to load Purchase Orders:", oError);
                    });
            }
        },
        onPurchaseOrderConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoNumber");
            let oInputSupplier = this.byId("idPoSupplier");
            let oInputPurchaseGrp = this.byId("idPoPurchGroup");
            let oInputPlant = this.byId("idFilterPlant");
            oInputSupplier.removeAllTokens();
            oInputPurchaseGrp.removeAllTokens();
            oMultiInput.removeAllTokens();
            oInputPlant.removeAllTokens();

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
                    oInputPlant.addToken(new sap.m.Token({
                        key: oData.Plant,
                        text: oData.Plant
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
            this._oPgDialog.open();
        },
        onPurchasingGroupSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._pgSearchQuery = sQuery;
            this._pgSkip = 0;
            this._pgHasMore = true;
            const oModel = this.getView().getModel("PgModelVh");
            const aAllPurchaseGroup = oModel.getProperty("/PurchasingGroups") || [];


            // Use filtered data from local cache
            this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["PurchaseOrder", "PurchasingGroup", "Supplier"]);


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
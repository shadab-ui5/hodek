sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
    function (JSONModel, Device) {
        "use strict";

        return {
            /**
             * Provides runtime information for the device the UI5 app is running on as a JSONModel.
             * @returns {sap.ui.model.json.JSONModel} The device model.
             */
            createDeviceModel: function () {
                let oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            },
            getUserInfo: function (_this, sUserid) {
                const oModel = _this.getOwnerComponent().getModel("vendorModel"); // assuming default model

                oModel.read("/supplierListByUser", {
                    filters: [
                        new sap.ui.model.Filter("Userid", sap.ui.model.FilterOperator.EQ, sUserid)
                    ],
                    success: function (oData) {
                        console.log("Fetched supplier list:", oData.results);
                        let oJSONModel = new sap.ui.model.json.JSONModel(oData.results);
                        
                        that.getOwnerComponent().setModel(oData.results, "SupplierVHModel");
                    },
                    error: function (oError) {
                        console.error("Error fetching supplier list", oError);
                    }
                });

            },

            loadFilterData: function (oODataModel, oFilterModel) {
                if (!oODataModel || !oFilterModel) {
                    console.error("Model.loadFilterData: Invalid arguments.");
                    return Promise.reject("Invalid model references");
                }

                return Promise.all([
                    this.loadPlants(oODataModel, oFilterModel),
                    this.loadPOHeader(oODataModel, oFilterModel),
                    this.loadPOItems(oODataModel, oFilterModel)
                ]);
            },
            loadPlants: function (oODataModel, oFilterModel) {
                return new Promise((resolve, reject) => {
                    oODataModel.read("/plantVh", {
                        success: function (oData) {
                            oFilterModel.setProperty("/", oData.results);
                            resolve();
                        },
                        error: function (err) {
                            console.error("Error fetching Plants", err);
                            reject(err);
                        }
                    });
                });
            },

            loadPOHeader: function (oODataModel, oFilterModel) {
                return new Promise((resolve, reject) => {
                    oODataModel.read("/PoHdr", {
                        success: function (oData) {
                            const results = oData.results;

                            const suppliers = [...new Set(results.map(item => item.Supplier))];
                            const purchasingGroups = [...new Set(results.map(item => item.PurchasingGroup))];
                            const companyCodes = [...new Set(results.map(item => item.CompanyCode))];
                            const poDates = [...new Set(results.map(item => item.PurchaseOrderDate))];
                            const PurchaseOrders = [...new Set(results.map(item => item.PurchaseOrder))];

                            oFilterModel.setProperty("/PurchaseOrders", PurchaseOrders);
                            oFilterModel.setProperty("/SuppliersFromPO", suppliers);
                            oFilterModel.setProperty("/PurchasingGroupsFromPO", purchasingGroups);
                            oFilterModel.setProperty("/CompanyCodesFromPO", companyCodes);
                            oFilterModel.setProperty("/PODatesFromPO", poDates);

                            resolve();
                        },
                        error: function (err) {
                            console.error("Error fetching PO Headers", err);
                            reject(err);
                        }
                    });
                });
            },

            loadPOItems: function (oODataModel, oModel, filterPO, oTable) {
                return new Promise((resolve, reject) => {
                    // Define filters only if PurchaseOrder is present
                    const aFilters = [];
                    if (filterPO) {
                        aFilters.push(new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.EQ, filterPO));
                    }
                    oODataModel.read("/PoItem", {
                        filters: aFilters,
                        success: function (oData) {
                            oModel.setProperty("/POItems", oData.results);
                            if (oTable) {
                                oTable.setBusy(false);
                            }
                            resolve();
                        },
                        error: function (err) {
                            console.error("Error fetching PO Items", err);
                            if (oTable) {
                                oTable.setBusy(false);
                            }
                            reject(err);
                        }
                    });
                });
            },


            fetchVendorPortalData: function (oModel, VendorPortalModel) {

                if (!oModel) {
                    console.error("Model 'vendorModel' not found.");
                    return;
                }

                // Read all records from 'vendor_portal' entity set
                oModel.read("/PoHdr", {
                    success: function (oData) {
                        console.log("Fetched vendor_portal data:", oData.results);

                        // Store into a JSON model (optional)
                        VendorPortalModel.setData(oData.results);
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error fetching vendor_portal data", oError);
                    }
                });
            },

            searchPoHeader: function (oView, oModel, oTableModel) {
                const aFilters = [];

                // Supplier (MultiComboBox)
                const aSelectedSuppliers = oView.byId("idPoSupplier").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (aSelectedSuppliers.length > 0) {
                    const supplierFilters = aSelectedSuppliers.map(s => new sap.ui.model.Filter("Supplier", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(supplierFilters, false)); // OR condition within supplier group
                }

                // Purchase Order 
                const sPurchaseOrder = oView.byId("idPoNumber").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (sPurchaseOrder.length > 0) {
                    const purchaseOrderFilters = sPurchaseOrder.map(s => new sap.ui.model.Filter("PurchaseOrder", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(purchaseOrderFilters, false)); // OR condition within supplier group
                }

                // Purchasing Group
                const sPurchGroup = oView.byId("idPoPurchGroup").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (sPurchGroup.length > 0) {
                    const PurGroupFilters = sPurchGroup.map(s => new sap.ui.model.Filter("PurchasingGroup", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(PurGroupFilters, false)); // OR condition within supplier group
                }
                // Plant Group
                const aPlantFilter = oView.byId("idFilterPlant").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (aPlantFilter.length > 0) {
                    const PlantFilters = aPlantFilter.map(s => new sap.ui.model.Filter("Plant", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(PlantFilters, false)); // OR condition within supplier group
                }

                // Company Code
                const sCompanyCode = oView.byId("idPoCompanyCode").getSelectedKey();
                if (sCompanyCode) {
                    aFilters.push(new sap.ui.model.Filter("CompanyCode", "EQ", sCompanyCode));
                }

                // Purchase Order Date
                const oDatePicker = oView.byId("idPoPurchDate");
                const oDate = oDatePicker.getDateValue();
                if (oDate) {
                    const sDateStr = oDate.toISOString().split("T")[0]; // Format to YYYY-MM-DD
                    aFilters.push(new sap.ui.model.Filter("PurchaseOrderDate", "EQ", sDateStr));
                }
                oView.setBusy(true);
                // 🔍 Read data from OData service with filters
                oModel.read("/PoHdr", {
                    filters: aFilters,
                    success: function (oData) {
                        const map = new Map();
                        const uniqueResults = [];

                        oData.results.forEach(item => {
                            const key = item.PurchaseOrder + "|" + item.Supplier + "|" + item.SupplierRespSalesPersonName; // Customize key fields
                            if (!map.has(key)) {
                                map.set(key, true);
                                uniqueResults.push(item);
                            }
                        });

                        oTableModel.setProperty("/POHeaders", uniqueResults); // bind this to your table
                        console.log("searched header PO>>", oData.results)
                        oView.setBusy(false);
                    },
                    error: function (err) {
                        console.error("Error while fetching filtered PO headers", err);
                        oView.setBusy(false);
                    }
                });
            },
            readSupplierVhData: function (oView, sUser, _this) {
                let that = _this;
                // Perform manual read with filter
                let oModel = that.getOwnerComponent().getModel('vendorModel'); // or your named model
                oModel.read("/SupplierVh", {
                    filters: [
                        new sap.ui.model.Filter("CreatedByUser", sap.ui.model.FilterOperator.EQ, sUser)
                    ],
                    success: function (oData) {
                        var aResults = oData.results;

                        // Store in model for dialog use
                        var oJSONModel = new sap.ui.model.json.JSONModel(aResults);
                        oView.setModel(oJSONModel, "SupplierVHModel");

                        if (aResults.length === 1) {
                            // ✅ Automatically select this supplier
                            var oMultiInput = that.byId("idPoSupplier");
                            oMultiInput.removeAllTokens();

                            oMultiInput.addToken(new sap.m.Token({
                                key: aResults[0].Supplier,
                                text: aResults[0].Supplier + " - " + aResults[0].BPSupplierName
                            }));

                            // Optional: store selected key in your FilterModel if used
                            var oFilterModel = oView.getModel("FilterModel");
                            if (oFilterModel) {
                                oFilterModel.setProperty("/SelectedSuppliers", [aResults[0].Supplier]);
                            }
                        }
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Failed to load suppliers");
                    }
                });
            },
            _loadPurchaseOrders: function (_this, sQuery, iSkip, iTop, fnCallback) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");

                let sUser = sap.ushell && sap.ushell.Container
                    ? sap.ushell.Container.getUser().getId()
                    : "CB9980000018";

                // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                let aFilters = [];
                if (sQuery) {
                    let oSearch = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("PurchaseOrder", "Contains", sQuery),
                            new sap.ui.model.Filter("Supplier", "Contains", sQuery)
                        ],
                        and: false
                    });
                    aFilters.push(oSearch);
                }

                oModel.read("/PoHdr", {
                    filters: aFilters,
                    urlParameters: {
                        "$top": iTop,
                        "$skip": iSkip
                    },
                    success: (oData) => {

                        fnCallback(oData.results);
                    },
                    error: () => {
                        sap.m.MessageToast.show("Error fetching Purchase Orders.");
                    }
                });
            },
            _loadPurchasingGroups: function (_this, sQuery, iSkip, iTop, fnCallback) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");

                let sUser = sap.ushell?.Container?.getUser()?.getId() || "CB9980000018";

                let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                if (sQuery) {
                    let oSearch = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("PurchasingGroup", "Contains", sQuery),
                            new sap.ui.model.Filter("CreatedByUser", "Contains", sQuery)
                        ],
                        and: false
                    });
                    aFilters.push(oSearch);
                }

                oModel.read("/PurGroupVh", {
                    filters: aFilters,
                    urlParameters: {
                        "$top": iTop,
                        "$skip": iSkip
                    },
                    success: (oData) => {
                        // const uniqueResults = oData.results.filter((item, index, self) =>
                        //     index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                        // );
                        fnCallback(oData.results);
                    },
                    error: () => {
                        sap.m.MessageToast.show("Error fetching Purchasing Groups.");
                    }
                });
            },
            _loadPlants: function (_this, sQuery, iSkip, iTop, fnCallback) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");

                let sUser = sap.ushell?.Container?.getUser().getId() || "CB9980000018";
                // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                let aFilters = [];

                if (sQuery) {
                    let oSearch = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Plant", "Contains", sQuery),
                            new sap.ui.model.Filter("PlantName", "Contains", sQuery)
                        ],
                        and: false
                    });
                    aFilters.push(oSearch);
                }

                oModel.read("/plantVh", {
                    filters: aFilters,
                    urlParameters: {
                        "$top": iTop,
                        "$skip": iSkip
                    },
                    success: (oData) => {
                        fnCallback(oData);
                    },
                    error: () => {
                        sap.m.MessageToast.show("Error fetching Plants.");
                    }
                });
            },
            fetchAsnItems: function (_this, oFinalFilter) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");
                oModel.read("/thirdscreen_po", {
                    filters: [oFinalFilter],
                    success: (oData) => {
                        // Set data to a new model to use in table
                        const oResultModel = new sap.ui.model.json.JSONModel({ Results: oData.results });
                        _this.getView().setModel(oResultModel, "AsnItemsModel");
                        _this.getView().setBusy(false);
                    },
                    error: (oError) => {
                        console.error("Failed to fetch data from /thirdscreen_po:", oError);
                        _this.getView().setBusy(false);
                    }
                });
            }




        };

    });
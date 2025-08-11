sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "hodek/vendorportal/utils/Formatter",
    "sap/ui/core/format/DateFormat"
],
    function (JSONModel, Device, Formatter, DateFormat) {
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
                return new Promise((resolve, reject) => {
                    const oModel = _this.getOwnerComponent().getModel("vendorModel"); // assuming default model

                    oModel.read("/supplierListByUser", {
                        filters: [
                            new sap.ui.model.Filter("Userid", sap.ui.model.FilterOperator.EQ, sUserid)
                        ],
                        success: function (oData) {
                            console.log("Fetched supplier list:", oData.results);

                            resolve(oData);
                        },
                        error: function (oError) {
                            console.error("Error fetching supplier list", oError);
                            reject(oError)
                        }
                    });
                })

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
                            if (oData && oData.results) {
                                oData.results.sort(function (a, b) {
                                    var itemA = parseInt(a.PurchaseOrderItem, 10);
                                    var itemB = parseInt(b.PurchaseOrderItem, 10);
                                    return itemA - itemB; // Ascending order
                                });
                            }
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
            loadSaItems: function (oODataModel, oModel, filterPO, oTable) {
                return new Promise((resolve, reject) => {
                    // Define filters only if PurchaseOrder is present
                    const aFilters = [];
                    if (filterPO) {
                        aFilters.push(new sap.ui.model.Filter("SchedulingAgreement", sap.ui.model.FilterOperator.EQ, filterPO));
                    }
                    oODataModel.read("/SaItem", {
                        filters: aFilters,
                        success: function (oData) {
                            if (oData && oData.results) {
                                oData.results.sort(function (a, b) {
                                    var itemA = parseInt(a.SchedulingAgreementItem, 10);
                                    var itemB = parseInt(b.SchedulingAgreementItem, 10);
                                    return itemA - itemB; // Ascending order
                                });
                            }
                            oModel.setProperty("/SaItems", oData.results);
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

            searchPoHeader: function (_this, oView, oModel, oTableModel) {
                const aFilters = [];
                let oStartDateFormat = DateFormat.getInstance({
                    pattern: "yyyy-MM-dd'T'00:00:00"
                });
                let oEndDateFormat = DateFormat.getInstance({
                    pattern: "yyyy-MM-dd'T'23:59:59"
                });
                // Supplier (MultiComboBox)
                const aSelectedSuppliers = oView.byId("idPoSupplier").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (aSelectedSuppliers.length > 0) {
                    const supplierFilters = aSelectedSuppliers.map(s => new sap.ui.model.Filter("Supplier", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(supplierFilters, false)); // OR condition within supplier group
                } else {
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];
                    const oOrFilter = new sap.ui.model.Filter(
                        uniqueSupplier.map(group =>
                            new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.EQ, group)
                        ),
                        false // OR
                    );
                    aFilters.push(oOrFilter);
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
                const oDRS = _this.getView().byId("idPoPurchDate");
                const oStartDate = oDRS.getDateValue();
                const oEndDate = oDRS.getSecondDateValue();

                if (oStartDate && oEndDate) {
                    // const fromDate = Formatter.formatDateToYyyyMmDd(oStartDate); // "2025-08-07"
                    // const toDate = Formatter.formatDateToYyyyMmDd(oEndDate);     // "2025-08-08"
                    const fromDate = oStartDateFormat.format(new Date(oStartDate)); // "2025-08-07"
                    const toDate = oEndDateFormat.format(new Date(oEndDate));     // "2025-08-08"

                    const dateRangeFilter = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("PurchaseOrderDate", sap.ui.model.FilterOperator.GE, fromDate),
                            new sap.ui.model.Filter("PurchaseOrderDate", sap.ui.model.FilterOperator.LE, toDate)
                        ],
                        and: true // ensures both conditions must match
                    });

                    aFilters.push(dateRangeFilter);
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
            searchSaHeader: function (_this, oView, oModel, oTableModel) {
                const aFilters = [];
                let oStartDateFormat = DateFormat.getInstance({
                    pattern: "yyyy-MM-dd'T'00:00:00"
                });
                let oEndDateFormat = DateFormat.getInstance({
                    pattern: "yyyy-MM-dd'T'23:59:59"
                });
                // Supplier (MultiComboBox)
                const aSelectedSuppliers = oView.byId("idPoSupplier").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (aSelectedSuppliers.length > 0) {
                    const supplierFilters = aSelectedSuppliers.map(s => new sap.ui.model.Filter("Supplier", "EQ", s));
                    aFilters.push(new sap.ui.model.Filter(supplierFilters, false)); // OR condition within supplier group
                }
                else {
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];
                    uniqueSupplier.push('1100000'); /// removewhile deployment
                    const oOrFilter = new sap.ui.model.Filter(
                        uniqueSupplier.map(group =>
                            new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.EQ, group)
                        ),
                        false // OR
                    );
                    aFilters.push(oOrFilter);
                }

                // Purchase Order 
                const sPurchaseOrder = oView.byId("idPoNumber").getTokens().map(function (oToken) {
                    return oToken.getKey();
                });
                if (sPurchaseOrder.length > 0) {
                    const purchaseOrderFilters = sPurchaseOrder.map(s => new sap.ui.model.Filter("SchedulingAgreement", "EQ", s));
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
                const sCompanyCode = oView.byId("idSaCompanyCode").getSelectedKey();
                if (sCompanyCode) {
                    aFilters.push(new sap.ui.model.Filter("CompanyCode", "EQ", sCompanyCode));
                }

                // Purchase Order Date
                const oDRS = _this.getView().byId("idPoPurchDate");
                const oStartDate = oDRS.getDateValue();
                const oEndDate = oDRS.getSecondDateValue();

                if (oStartDate && oEndDate) {
                    // const fromDate = Formatter.formatDateToYyyyMmDd(oStartDate); // "2025-08-07"
                    // const toDate = Formatter.formatDateToYyyyMmDd(oEndDate);     // "2025-08-08"
                    const fromDate = oStartDateFormat.format(new Date(oStartDate)); // "2025-08-07"
                    const toDate = oEndDateFormat.format(new Date(oEndDate));     // "2025-08-08"

                    const dateRangeFilter = new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("CreationDate", sap.ui.model.FilterOperator.GE, fromDate),
                            new sap.ui.model.Filter("CreationDate", sap.ui.model.FilterOperator.LE, toDate)
                        ],
                        and: true // ensures both conditions must match
                    });

                    aFilters.push(dateRangeFilter);
                }
                oView.setBusy(true);
                // 🔍 Read data from OData service with filters
                oModel.read("/SaHdr", {
                    filters: aFilters,
                    success: function (oData) {
                        const map = new Map();
                        const uniqueResults = [];

                        oData.results.forEach(item => {
                            const key = item.SchedulingAgreement + "|" + item.PaymentTerms + "|" + item.SupplierRespSalesPersonName; // Customize key fields
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

            _loadPurchaseOrders: function (_this, sQuery, iSkip, iTop) {
                return new Promise((resolve, reject) => {
                    let oModel = _this.getOwnerComponent().getModel("vendorModel");
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];
                    console.log("Unique Suppliers:", uniqueSupplier)
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
                    } else {
                        const oOrFilter = new sap.ui.model.Filter(
                            uniqueSupplier.map(group =>
                                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.EQ, group)
                            ),
                            false // OR
                        );
                        aFilters.push(oOrFilter);
                    }

                    oModel.read("/PoHdr", {
                        filters: aFilters,
                        urlParameters: {
                            "$top": iTop,
                            "$skip": iSkip
                        },
                        success: (oData) => {
                            const uniqueResults = oData.results.filter((item, index, self) =>
                                index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                            );
                            let oModel = _this.getOwnerComponent().getModel("PoModelVh");
                            oModel.setProperty("/PurchaseOrders", uniqueResults);
                            resolve(oData.results)

                        },
                        error: (err) => {
                            sap.m.MessageToast.show("Error fetching Purchase Orders.");
                            reject(err)
                        }
                    });
                })
            },
            _loadSchedulingAgre: function (_this, sQuery, iSkip, iTop) {
                return new Promise((resolve, reject) => {
                    let oModel = _this.getOwnerComponent().getModel("vendorModel");
                    let oSupplierVHModel = _this.getOwnerComponent().getModel("SupplierVHModel").getData();
                    const uniqueSupplier = [...new Set(oSupplierVHModel.map(obj => obj.Supplier))];
                    uniqueSupplier.push('1100000'); /// removewhile deployment
                    console.log("Unique Suppliers:", uniqueSupplier)
                    // let aFilters = [new sap.ui.model.Filter("CreatedByUser", "EQ", sUser)];
                    let aFilters = [];
                    if (sQuery) {
                        let oSearch = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("SchedulingAgreement", "Contains", sQuery),
                                new sap.ui.model.Filter("Supplier", "Contains", sQuery)
                            ],
                            and: false
                        });
                        aFilters.push(oSearch);
                    }
                    else {
                        const oOrFilter = new sap.ui.model.Filter(
                            uniqueSupplier.map(group =>
                                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.EQ, group)
                            ),
                            false // OR
                        );
                        aFilters.push(oOrFilter);
                    }

                    oModel.read("/SaHdr", {
                        filters: aFilters,
                        urlParameters: {
                            "$top": iTop,
                            "$skip": iSkip
                        },
                        success: (oData) => {
                            const uniqueResults = oData.results.filter((item, index, self) =>
                                index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                            );
                            let oModel = _this.getOwnerComponent().getModel("SaModelVh");
                            oModel.setProperty("/PurchaseOrders", uniqueResults);
                            resolve(oData.results)

                        },
                        error: (err) => {
                            sap.m.MessageToast.show("Error fetching Purchase Orders.");
                            reject(err)
                        }
                    });
                })
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
                oModel.read("/ItemforPo", {
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
            },
            fetchAsnSaItems: function (_this, oFinalFilter) {
                let oModel = _this.getOwnerComponent().getModel("vendorModel");
                oModel.read("/ItemforSchAgr", {
                    filters: [oFinalFilter],
                    success: (oData) => {
                        // Set data to a new model to use in table
                        const oResultModel = new sap.ui.model.json.JSONModel({ Results: oData.results });
                        _this.getView().setModel(oResultModel, "AsnSaItemsModel");
                        _this.getView().setBusy(false);
                    },
                    error: (oError) => {
                        console.error("Failed to fetch data from /thirdscreen_po:", oError);
                        _this.getView().setBusy(false);
                    }
                });
            },




        };

    });
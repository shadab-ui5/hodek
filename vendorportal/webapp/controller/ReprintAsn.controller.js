sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/date/UI5Date",
    'sap/ui/model/json/JSONModel'
], (Controller, Models, Formatter, DateFormat, UI5Date, JSONModel) => {
    "use strict";
    //QR & PDF in use libraries //
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.vendorportal.model.qrCode");
    jQuery.sap.require("hodek.vendorportal.model.jspdf");
    return Controller.extend("hodek.vendorportal.controller.ReprintAsn", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteScheduleAgreeOrder").attachPatternMatched(this._onRouteMatched, this);
            this.oBusyDialog = new sap.m.BusyDialog({ text: "Loading data..." });
            this.oBusyDialog.open();
            this.iSkip = 0;
            this.iTop = 20; // page size
            this.sQuery = ""; // store current search query
            let that = this;
            const oAsnModelVh = new sap.ui.model.json.JSONModel();
            const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
            const oPgVHModel = new sap.ui.model.json.JSONModel([]);
            const oAsnHeaderModel = new sap.ui.model.json.JSONModel([]);
            this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            this.getOwnerComponent().setModel(oAsnHeaderModel, "AsnHeaderModel");
            this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
            this.getOwnerComponent().setModel(oAsnModelVh, "AsnModelVh");
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("UserInfo").then(function (UserInfo) {
                    let loginUser = UserInfo.getId();
                    Models.getUserInfo(that, loginUser).then((oData) => {
                        const uniqueGroups = [...new Map(oData.results.map(obj => [obj.PurchasingGroup, obj])).values()];

                        that.getOwnerComponent().getModel("PgVHModel").setData(uniqueGroups);

                        that.getOwnerComponent().getModel("SupplierVHModel").setData(oData.results);
                        console.log("UserInfo Loaded..")
                        that.loadPurchaseOrderFilter();
                    }).catch((oError) => {
                        console.error("Failed to load Purchase Orders:", oError);
                    });
                });
            } else {
                console.warn("Not running in Fiori Launchpad, using fallback user");
                let loginUser = "CB9980000026"; // fallback or hardcoded for local testing
                Models.getUserInfo(that, loginUser).then((oData) => {
                    const uniqueGroups = [...new Map(oData.results.map(obj => [obj.PurchasingGroup, obj])).values()];

                    that.getOwnerComponent().getModel("PgVHModel").setData(uniqueGroups);

                    that.getOwnerComponent().getModel("SupplierVHModel").setData(oData.results);
                    console.log("UserInfo Loaded..")
                    that.loadPurchaseOrderFilter();
                }).catch((oError) => {
                    console.error("Failed to load Purchase Orders:", oError);
                });;
            }

        },
        _onRouteMatched: function (oEvent) {
            const oTable = this.byId("idAsnTable");
            oTable.setBusy(true); // Show busy indicator
            const oODataModel = this.getOwnerComponent().getModel("vendorModel");
            // Assuming the model name is "SaItemModel"
            const oSaItemModel = this.getOwnerComponent().getModel("AsnHeaderModel");
            this.oBusyDialog.open()
            this.loadPurchaseOrderFilter();
            // Use sPOId to filter model or fetch data
        },
        loadPurchaseOrderFilter: function () {
            // Load PO data and build company code model
            let _this = this;
            this.oBusyDialog.setText("Setting Table..");
            this.oBusyDialog.open()
            Models._loadAsn(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.getProperty("/AsnData") || [];

                    // Append instead of overwrite
                    oAsnModel.setProperty("/AsnData", aExisting.concat(aResults));

                    // Update skip for next load
                    _this.iSkip += aResults.length;
                    _this.oBusyDialog.close();
                })
                .catch(function () {
                    _this.oBusyDialog.close();
                });
        },
        onSelectionChange: function (oEvent) {
            let oTable = this.byId("idAsnTable"); // Your table ID
            let aSelectedItems = oTable.getSelectedItems();

            let oButton = this.byId("idActionReprint"); // Your button ID
            oButton.setEnabled(aSelectedItems.length > 0);
        },
        formatter: Formatter,
        onSearch: function (oEvent) {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel("vendorModel"); // OData model
            const oTableModel = this.getOwnerComponent().getModel("TableModelPO"); // Target model for results
            const oFilterModel = this.getOwnerComponent().getModel("FilterModel");
            this.loadPurchaseOrderFilter();

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
        onAsnValueHelp: function () {
            let oView = this.getView();

            if (!this._oPoDialog) {
                this._oPoDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.AsnValueHelp", this);
                oView.addDependent(this._oPoDialog);
            }
            this._oPoDialog.open();

        },

        onAsnSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._poSearchQuery = sQuery;
            this._poSkip = 0;
            this._poHasMore = true;

            const oModel = this.getView().getModel("AsnModelVh");
            const aAllPo = oModel.getProperty("/AsnNumbers") || [];

            // Filter existing local data
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["AsnNo", "Plant", "InvoiceNo"]);

            } else {
                this._oPoDialog.setBusy(true);
                Models._loadAsn(this, sQuery, 0, 2000)
                    .then(() => {
                        this._oPoDialog.setBusy(false); // ✅ Stop busy after success
                    })
                    .catch((oError) => {
                        this._oPoDialog.setBusy(false); // ✅ Also stop busy on error
                        console.error("Failed to load Purchase Orders:", oError);
                    });
            }
        },
        onAsnConfirm: function (oEvent) {
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
        },
        onLiveChange: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            this._applySearchFilter(sQuery);
        },

        onSearchAsn: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            this._applySearchFilter(sQuery);
        },

        _applySearchFilter: function (sQuery) {
            var oTable = this.byId("idAsnTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim() !== "") {
                // Build OR filter for all searchable properties
                var aFilters = [
                    new sap.ui.model.Filter("AsnNo", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.Contains, sQuery),
                ];

                var oFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false // OR across all fields
                });

                // Apply search as "Application" filter so it works with other filters
                oBinding.filter([oFilter], "Application");
            } else {
                // Clear only the search filter
                oBinding.filter([], "Application");
            }
        },
        handleReprint: function () {
            let oTable = this.byId("idAsnTable"); // Replace with your table ID
            let aSelectedContexts = oTable.getSelectedContexts(); // Works for sap.m.Table

            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select at least one row.");
                return;
            }

            let aSelectedData = aSelectedContexts.map(function (oContext) {
                return oContext.getObject(); // Gets the row's data object
            });

            // console.log("Selected Row Data:", aSelectedData);

            // // Example: You can store it in a model for later use
            // let oModel = new sap.ui.model.json.JSONModel({ selectedRows: aSelectedData });
            // this.getOwnerComponent().setModel(oModel, "SelectedRowsModel");
            this.onViewQR(aSelectedData[0]);
        },
        onViewQR: function (qrData) {
            let that = this;
            //let oQRCodeBox = new sap.m.VBox({});
            let oQRCodeBox = this.getView().byId("idVBox_QRCode");
            oQRCodeBox.setVisible(true);
            const oHtmlComp = new sap.ui.core.HTML({
                content: '<canvas id="qrCanvas" width="200" height="200" style="display:none;"></canvas>'
            });
            oQRCodeBox.addItem(oHtmlComp);

            setTimeout(function () {
                let sQRCodeNumber = qrData.AsnNo; // Data to encode in QR Code
                // Generate QR Code using qrcode.js
                QRCode.toCanvas(document.getElementById('qrCanvas'), sQRCodeNumber, function (error) {
                    if (error) {
                        sap.m.MessageToast.show("QR Code generation failed!");
                        return;
                    }
                    sap.m.MessageToast.show("QR Code generated!");
                    // After generating the QR Code, create PDF
                    that._generatePDF(qrData);
                    // oQRCodeBox.setVisible(false);
                }.bind(this));
            }, 200);
        },
        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);

            let invDate = new Date(qrData.InvoiceDate);
            let formattedInvDate = invDate.getDate().toString().padStart(2, '0') + '/' +
                (invDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                invDate.getFullYear();
            let sysDate = new Date(qrData.SystemDate);
            let formattedSystemDate = sysDate.getDate().toString().padStart(2, '0') + '/' +
                (sysDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                sysDate.getFullYear();

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor('#000');

            doc.text(2, 5, `Asn No.: ${qrData.AsnNo}`);
            doc.text(2, 9, `QR Code/ASN: ${qrData.GateEntryId}`);
            doc.text(2, 13, `Inv No.: ${qrData.InvoiceNo}`);
            doc.text(2, 17, `Inv Date: ${formattedInvDate}`);

            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 35, 1, 15, 15); // Adjust size and position as necessary
            doc.text(33, 18, `Gt Date: ${formattedSystemDate}`);

            // Save the PDF to a file
            doc.save(`ASN_${qrData.AsnNo}.pdf`);
        },


    });
});